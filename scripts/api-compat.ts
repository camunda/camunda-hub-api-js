/**
 * Decide how a change to the SDK's public API should be versioned, by type-checking the
 * current build's declarations against a baseline build's declarations.
 *
 *   tsx scripts/api-compat.ts --baseline <dir> [--current dist] [--out-json f] [--out-md f]
 *
 * Both directories hold a tsup declaration build (index.d.ts, logger.d.ts, fn/index.d.ts).
 * The baseline must live inside the repository so its imports resolve from node_modules.
 *
 * The check is semantic, not textual:
 * - A HubClient method or `/fn` function is BREAKING when arguments that the old signature
 *   accepted are no longer accepted, or when the new result is not assignable to the old
 *   result, or when an argument property path an object literal could set (`arg0.description`,
 *   nested ones included) no longer exists — object literals are excess-property checked, so
 *   a removed input property breaks callers even though assignability still holds. The same
 *   applies to each search operation's `.paginate(...)`.
 * - Exported values are compared independently of a same-named type: removing the value, or a
 *   member of it (such as a branded key's `assumeExists`), is BREAKING; its callable members
 *   are compared like functions.
 * - A removed export (from any entry point) or a removed client method is BREAKING.
 * - Anything else that differs (added exports or methods, signatures that changed
 *   compatibly, changed non-generic exported types) is ADDITIVE.
 * - Otherwise there is NO public API change.
 *
 * Exported types that are not used by a signature (for example models users annotate their
 * own code with) are reported as changed, but are not classified as breaking: whether a
 * change to them breaks users depends on how they use them. They are listed for review.
 *
 * Prints `decision=<none|additive|breaking>` and appends it to $GITHUB_OUTPUT when set.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export type Decision = 'none' | 'additive' | 'breaking';

export interface CompatReport {
  decision: Decision;
  removedExports: string[];
  addedExports: string[];
  removedMethods: string[];
  addedMethods: string[];
  /** Signatures that no longer accept old arguments or return incompatible results. */
  breakingSignatures: string[];
  /** Signatures that changed in a backward-compatible way. */
  compatibleSignatures: string[];
  /** Non-generic exported types whose shape changed (direction-neutral; for review). */
  changedTypes: string[];
}

const ENTRIES: Record<string, string> = {
  '.': 'index',
  './logger': 'logger',
  './fn': 'fn/index',
};

/** Names declared on HubCore are runtime plumbing, not operations. */
const CORE_ENTRY = 'index';

interface Check {
  line: string;
  /** What a failure of this assertion means. */
  onFail: { list: keyof CompatReport; item: string };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function relImport(fromDir: string, file: string): string {
  let rel = path.relative(fromDir, file).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function moduleExports(checker: ts.TypeChecker, sf: ts.SourceFile): Map<string, ts.Symbol> {
  const sym = checker.getSymbolAtLocation(sf);
  const out = new Map<string, ts.Symbol>();
  if (!sym) return out;
  for (const e of checker.getExportsOfModule(sym)) out.set(e.getName(), e);
  return out;
}

function resolveAlias(checker: ts.TypeChecker, s: ts.Symbol): ts.Symbol {
  return s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s;
}

function isGenericType(s: ts.Symbol): boolean {
  return (s.declarations ?? []).some(
    (d) =>
      (ts.isTypeAliasDeclaration(d) || ts.isInterfaceDeclaration(d) || ts.isClassDeclaration(d)) &&
      (d.typeParameters?.length ?? 0) > 0
  );
}

/**
 * True when a type carries private or protected class members. TypeScript compares such
 * classes nominally, so an old and a new copy of the same runtime class (HubCore,
 * HubClientBase) never match. These are runtime classes, not spec-driven types; the API they
 * expose is compared member by member instead.
 */
function hasNominalMembers(checker: ts.TypeChecker, t: ts.Type, depth = 1): boolean {
  const types = t.isUnionOrIntersection() ? t.types : [t];
  return types.some((part) =>
    checker.getPropertiesOfType(part).some(
      (p) =>
        (p.declarations ?? []).some(
          (d) =>
            ts.getCombinedModifierFlags(d) &
              (ts.ModifierFlags.Private | ts.ModifierFlags.Protected) ||
            // `#private` fields are nominal too.
            (ts.isPropertyDeclaration(d) && ts.isPrivateIdentifier(d.name))
        ) ||
        // One level down catches wrappers such as `{ inner: HubClient }`.
        (depth > 0 && hasNominalMembers(checker, checker.getTypeOfSymbol(p), depth - 1))
    )
  );
}

/**
 * True when a type is or directly holds an enum. Enums from two copies of a declaration are
 * assignable to each other (same name and members) but never identical.
 */
function containsEnum(checker: ts.TypeChecker, t: ts.Type, depth = 1): boolean {
  const types = t.isUnion() ? t.types : [t];
  return types.some(
    (part) =>
      Boolean(part.flags & (ts.TypeFlags.EnumLike | ts.TypeFlags.EnumLiteral)) ||
      (depth > 0 &&
        checker
          .getPropertiesOfType(part)
          .some((p) => containsEnum(checker, checker.getTypeOfSymbol(p), depth - 1)))
  );
}

/**
 * Input property paths of the old type that have no counterpart on the new side. Union branches
 * are matched to the branch they are assignable to (in either direction) before comparing, so a
 * widened discriminator (`kind: 'a'` -> `kind: 'a' | 'c'`) is compared against the branch it
 * widened from rather than being reported as removing that branch's paths. Returns display paths
 * prefixed with the OLD branch's discriminant.
 */
function diffInputPaths(
  oldChecker: ts.TypeChecker,
  oldType: ts.Type,
  newChecker: ts.TypeChecker,
  newType: ts.Type | undefined,
  prefix: string,
  out: Set<string>,
  depth = 4,
  seen: Set<ts.Type> = new Set()
): void {
  if (oldType.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.NonPrimitive)) return; // open below here: any key was accepted, nothing is "removed"
  if (depth < 0 || seen.has(oldType)) return;
  if (oldType.isUnion()) {
    for (const part of oldType.types)
      diffInputPaths(
        oldChecker,
        part,
        newChecker,
        newType?.isUnion() ? matchBranch(oldChecker, part, newChecker, newType.types) : newType,
        `${prefix}${discriminant(oldChecker, part)}`,
        out,
        depth,
        seen
      );
    return;
  }
  if (newType?.isUnion()) {
    // The position became a union (for example made optional: `T` -> `T | undefined`): compare
    // against the branch that still accepts the old value.
    const match = matchBranch(oldChecker, oldType, newChecker, newType.types);
    if (match) newType = match;
  }
  if (oldType.isIntersection()) {
    // Match each part to the same-position part of the new intersection (a branded primitive is
    // `string & { __brand }`; the object part must be compared against the new object part, not
    // the whole intersection).
    oldType.types.forEach((part, i) => {
      const np =
        newType?.isIntersection() && newType.types.length === oldType.types.length
          ? newType.types[i]
          : undefined;
      diffInputPaths(oldChecker, part, newChecker, np, prefix, out, depth, seen);
    });
    return;
  }
  if (!(oldType.flags & ts.TypeFlags.Object)) return;
  if (oldType.getCallSignatures().length || oldType.getConstructSignatures().length) return;
  // The new side to compare against: only a plain object (unions/intersections are matched to a
  // single branch by the caller). Anything else means this object position no longer exists.
  const newObj =
    newType &&
    newType.flags & ts.TypeFlags.Object &&
    !newType.isUnion() &&
    !newType.isIntersection()
      ? newType
      : undefined;
  if (newType && !newObj) {
    out.add(prefix);
    return;
  }
  const next = new Set(seen).add(oldType);
  if (oldChecker.isArrayType(oldType) || oldChecker.isTupleType(oldType)) {
    const cEl =
      newObj && (newChecker.isArrayType(newObj) || newChecker.isTupleType(newObj))
        ? newChecker.getTypeArguments(newObj as ts.TypeReference)[0]
        : undefined;
    for (const el of oldChecker.getTypeArguments(oldType as ts.TypeReference))
      diffInputPaths(oldChecker, el, newChecker, cEl, `${prefix}[]`, out, depth - 1, next);
    return;
  }
  const oldOpen = oldChecker.getIndexInfosOfType(oldType).length > 0;
  const newOpen = newObj ? newChecker.getIndexInfosOfType(newObj).length > 0 : false;
  for (const p of oldChecker.getPropertiesOfType(oldType)) {
    const path = `${prefix}.${p.getName()}`;
    const np = newObj ? newObj.getProperty(p.getName()) : undefined;
    if (!np) {
      // Removed key: breaking unless either side accepts any key at this path (an index
      // signature on the new side still accepts it; one on the old side means it was never a
      // declared, excess-checked key).
      if (!newOpen && !oldOpen) out.add(path);
      continue;
    }
    diffInputPaths(
      oldChecker,
      oldChecker.getTypeOfSymbol(p),
      newChecker,
      newChecker.getTypeOfSymbol(np),
      path,
      out,
      depth - 1,
      next
    );
  }
}

type Category = 'array' | 'object' | 'callable' | `primitive:${number}`;

function category(checker: ts.TypeChecker, t: ts.Type): Category {
  if (t.flags & ts.TypeFlags.Object) {
    if (checker.isArrayType(t) || checker.isTupleType(t)) return 'array';
    if (t.getCallSignatures().length || t.getConstructSignatures().length) return 'callable';
    return 'object';
  }
  return `primitive:${t.flags}`;
}

/**
 * The branch of a new union that corresponds to an old type: one it is assignable to (or from),
 * else the only branch of the same kind (object, array, ...), preferring an equal discriminant.
 * Assignability alone is not enough because types from the two programs are compared.
 */
function matchBranch(
  oldChecker: ts.TypeChecker,
  part: ts.Type,
  newChecker: ts.TypeChecker,
  candidates: readonly ts.Type[]
): ts.Type | undefined {
  const assignable = candidates.find((c) => {
    try {
      return newChecker.isTypeAssignableTo(part, c) || newChecker.isTypeAssignableTo(c, part);
    } catch {
      return false;
    }
  });
  if (assignable) return assignable;
  const cat = category(oldChecker, part);
  const same = candidates.filter((c) => category(newChecker, c) === cat);
  if (same.length === 1) return same[0];
  const disc = discriminant(oldChecker, part);
  const byDisc = same.filter((c) => discriminant(newChecker, c) === disc);
  return byDisc.length === 1 ? byDisc[0] : undefined;
}

/**
 * `<kind="a">`-style tag naming a union branch by its literal-typed properties, or '' when the
 * branch has none (then branches share their paths).
 */
function discriminant(checker: ts.TypeChecker, t: ts.Type, only?: Set<string>): string {
  if (!(t.flags & ts.TypeFlags.Object)) return '';
  const tags: string[] = [];
  for (const p of checker.getPropertiesOfType(t)) {
    if (only && !only.has(p.getName())) continue;
    // An optional literal property is not a discriminant.
    if (only && p.flags & ts.SymbolFlags.Optional) continue;
    const pt = checker.getNonNullableType(checker.getTypeOfSymbol(p));
    if (
      pt.flags &
      (ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral | ts.TypeFlags.BooleanLiteral)
    )
      tags.push(`${p.getName()}=${checker.typeToString(pt)}`);
  }
  return tags.length ? `<${tags.sort().join(',')}>` : '';
}

/** Input paths the old callable accepted that the new one no longer accepts. */
function removedInputs(
  oldChecker: ts.TypeChecker,
  oldType: ts.Type,
  newChecker: ts.TypeChecker,
  newType: ts.Type,
  skip: number
): string[] {
  const out = new Set<string>();
  const oldSigs = oldType.getCallSignatures();
  const newSigs = newType.getCallSignatures();
  oldSigs.forEach((sig, si) => {
    const newParams = newSigs[si]?.parameters ?? [];
    sig.parameters.slice(skip).forEach((p, i) => {
      const np = newParams[i + skip];
      diffInputPaths(
        oldChecker,
        oldChecker.getTypeOfSymbol(p),
        newChecker,
        np ? newChecker.getTypeOfSymbol(np) : undefined,
        `arg${i}`,
        out
      );
    });
  });
  return [...out].sort();
}

/**
 * Property paths a caller may read from a result of type `t` (for example `result.name` or
 * `result.items[]`). Like the input walk, but for the read side: a path that disappears breaks
 * callers awaiting the result and reading that property, even when the new result is still
 * assignable to the old (a removed optional property keeps assignability).
 */
function resultPaths(
  checker: ts.TypeChecker,
  t: ts.Type,
  prefix: string,
  paths: Set<string>,
  open: Set<string>,
  depth = 4,
  seen: Set<ts.Type> = new Set()
): void {
  if (t.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.NonPrimitive)) {
    open.add(prefix);
    return;
  }
  if (depth < 0 || seen.has(t)) return;
  if (t.isUnion()) {
    // Tag branches only by literal properties every object branch declares (the union's real
    // discriminants), so adding an optional literal property to one branch does not rename
    // that branch's existing paths.
    const objects = t.types.filter((x) => x.flags & ts.TypeFlags.Object);
    const keys = objects.length
      ? objects
          .map((x) => new Set(checker.getPropertiesOfType(x).map((q) => q.getName())))
          .reduce((a, b) => new Set([...a].filter((k) => b.has(k))))
      : new Set<string>();
    for (const part of t.types)
      resultPaths(
        checker,
        part,
        `${prefix}${discriminant(checker, part, keys)}`,
        paths,
        open,
        depth,
        seen
      );
    return;
  }
  if (t.isIntersection()) {
    for (const part of t.types) resultPaths(checker, part, prefix, paths, open, depth, seen);
    return;
  }
  if (!(t.flags & ts.TypeFlags.Object)) return;
  if (t.getCallSignatures().length || t.getConstructSignatures().length) return;
  const next = new Set(seen).add(t);
  if (checker.isArrayType(t) || checker.isTupleType(t)) {
    for (const el of checker.getTypeArguments(t as ts.TypeReference))
      resultPaths(checker, el, `${prefix}[]`, paths, open, depth - 1, next);
    return;
  }
  if (checker.getIndexInfosOfType(t).length) open.add(prefix);
  for (const p of checker.getPropertiesOfType(t)) {
    const path = `${prefix}.${p.getName()}`;
    paths.add(path);
    resultPaths(checker, checker.getTypeOfSymbol(p), path, paths, open, depth - 1, next);
  }
}

/** Result property paths the old callable's awaited result exposed that the new one drops. */
function removedResults(
  oldChecker: ts.TypeChecker,
  oldType: ts.Type,
  newChecker: ts.TypeChecker,
  newType: ts.Type
): string[] {
  const sig = (t: ts.Type) => t.getCallSignatures()[0];
  const o = sig(oldType);
  const nw = sig(newType);
  if (!o || !nw) return [];
  const awaited = (checker: ts.TypeChecker, s: ts.Signature) => {
    const r = s.getReturnType();
    return checker.getAwaitedType(r) ?? r;
  };
  const walk = (checker: ts.TypeChecker, t: ts.Type) => {
    const paths = new Set<string>();
    const open = new Set<string>();
    resultPaths(checker, t, 'result', paths, open);
    return { paths, open };
  };
  const oPaths = walk(oldChecker, awaited(oldChecker, o));
  const nPaths = walk(newChecker, awaited(newChecker, nw));
  const isOpen = (p: string) => {
    for (let q = p; q.includes('.'); ) {
      q = q.slice(0, q.lastIndexOf('.'));
      if (nPaths.open.has(q)) return true;
    }
    return false;
  };
  return [...oPaths.paths].filter((p) => !nPaths.paths.has(p) && !isOpen(p)).sort();
}

/** Callable members of HubClient (operations), excluding HubCore plumbing. */
function clientMethods(checker: ts.TypeChecker, exportsOfIndex: Map<string, ts.Symbol>) {
  const methods = new Map<string, { paginate: boolean; type: ts.Type }>();
  const client = exportsOfIndex.get('HubClient');
  const core = exportsOfIndex.get('HubCore');
  if (!client) return methods;
  const coreNames = new Set<string>();
  if (core) {
    const coreType = checker.getDeclaredTypeOfSymbol(resolveAlias(checker, core));
    for (const p of checker.getPropertiesOfType(coreType)) coreNames.add(p.getName());
  }
  const clientType = checker.getDeclaredTypeOfSymbol(resolveAlias(checker, client));
  for (const p of checker.getPropertiesOfType(clientType)) {
    const name = p.getName();
    if (coreNames.has(name) || name.startsWith('_')) continue;
    const t = checker.getTypeOfSymbol(p);
    if (t.getCallSignatures().length === 0) continue;
    methods.set(name, {
      paginate: Boolean(t.getProperty('paginate')),
      type: t,
    });
  }
  return methods;
}

function loadSide(dir: string) {
  const files = Object.values(ENTRIES).map((e) => path.join(dir, `${e}.d.ts`));
  for (const f of files) if (!fs.existsSync(f)) throw new Error(`Missing declaration file: ${f}`);
  const program = ts.createProgram(files, {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
  });
  const checker = program.getTypeChecker();
  const exports: Record<string, Map<string, ts.Symbol>> = {};
  for (const e of Object.values(ENTRIES)) {
    const sf = program.getSourceFile(path.join(dir, `${e}.d.ts`));
    if (!sf) throw new Error(`Could not load ${e}.d.ts from ${dir}`);
    exports[e] = moduleExports(checker, sf);
  }
  return {
    checker,
    exports,
    methods: clientMethods(checker, exports[CORE_ENTRY]),
  };
}

export function compareApis(baselineDir: string, currentDir: string): CompatReport {
  const baselineAbs = path.resolve(baselineDir);
  const currentAbs = path.resolve(currentDir);
  const oldSide = loadSide(baselineAbs);
  const newSide = loadSide(currentAbs);

  const report: CompatReport = {
    decision: 'none',
    removedExports: [],
    addedExports: [],
    removedMethods: [],
    addedMethods: [],
    breakingSignatures: [],
    compatibleSignatures: [],
    changedTypes: [],
  };

  const checks: Check[] = [];
  const imports: string[] = [];
  const checkDir = baselineAbs;
  let n = 0;
  const id = () => `_c${n++}`;

  const helpers = [
    'type _P<F> = F extends (...a: infer A) => any ? A : never;',
    'type _R<F> = F extends (...a: any) => infer X ? Awaited<X> : never;',
    'type _RawR<F> = F extends (...a: any) => infer X ? X : never;',
    // `/fn` operations take the runtime core first; compare the operation arguments after it.
    'type _Op<F> = _P<F> extends [any, ...infer Rest] ? Rest : never;',
    // Exact type identity (also sees added optional properties, which assignability ignores).
    'type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;',
  ];

  /** Old value of type `from` must be assignable to `to`. */
  const assign = (from: string, to: string, onFail: Check['onFail']) => {
    const a = id();
    checks.push({
      line: `declare const ${a}: ${from}; const ${a}_ok: ${to} = ${a};`,
      onFail,
    });
  };

  /** `a` and `b` must be the identical type. */
  const same = (a: string, b: string, onFail: Check['onFail']) => {
    checks.push({ line: `const ${id()}: _Eq<${a}, ${b}> = true;`, onFail });
  };

  /** Directional checks for a callable: breaking, plus identity (detects compatible changes). */
  const callable = (
    label: string,
    o: string,
    nw: string,
    opts: {
      params?: '_P' | '_Op';
      compareResult?: boolean;
      removedInputs?: string[];
      removedResults?: string[];
    } = {}
  ) => {
    const P = opts.params ?? '_P';
    for (const p of opts.removedInputs ?? [])
      report.breakingSignatures.push(`${label} (parameters: removed ${p})`);
    assign(`${P}<${o}>`, `${P}<${nw}>`, {
      list: 'breakingSignatures',
      item: `${label} (parameters)`,
    });
    same(`${P}<${o}>`, `${P}<${nw}>`, {
      list: 'compatibleSignatures',
      item: `${label} (parameters)`,
    });
    if (opts.compareResult === false) return;
    for (const p of opts.removedResults ?? [])
      report.breakingSignatures.push(`${label} (result: removed ${p})`);
    assign(`_R<${nw}>`, `_R<${o}>`, {
      list: 'breakingSignatures',
      item: `${label} (result)`,
    });
    same(`_R<${o}>`, `_R<${nw}>`, {
      list: 'compatibleSignatures',
      item: `${label} (result)`,
    });
    // The awaited result can be unchanged while the wrapper changed (a promise that lost
    // `cancel()`, a `cancel()` whose signature changed, or a promise that became synchronous).
    // Compare the unawaited return types in the comparison program: the new wrapper must be
    // assignable to the old one (breaking otherwise); a non-identical one is a compatible change.
    assign(`_RawR<${nw}>`, `_RawR<${o}>`, {
      list: 'breakingSignatures',
      item: `${label} (result wrapper)`,
    });
    same(`_RawR<${o}>`, `_RawR<${nw}>`, {
      list: 'compatibleSignatures',
      item: `${label} (result wrapper)`,
    });
  };

  /**
   * Compare an exported value (for example a branded key's `{ assumeExists, getValue, isValid }`
   * companion object) member by member: a removed member is a removed export, a callable member
   * is compared like any function, and other members must keep an assignable type.
   */
  const valueMembers = (
    label: string,
    o: string,
    nw: string,
    oldType: ts.Type,
    newType: ts.Type,
    exportLabel: string
  ) => {
    if (oldType.getCallSignatures().length) {
      callable(label, o, nw, {
        removedInputs: removedInputs(oldSide.checker, oldType, newSide.checker, newType, 0),
        removedResults: removedResults(oldSide.checker, oldType, newSide.checker, newType),
      });
    }
    // A primitive value (a `string` constant such as SPEC_HASH) has only the primitive's
    // apparent members (`charAt`, `[Symbol.iterator]`, ...); compare the value type as a whole.
    if (!(oldType.flags & ts.TypeFlags.Object) || !(newType.flags & ts.TypeFlags.Object)) {
      if (!oldType.getCallSignatures().length) {
        assign(nw, o, { list: 'breakingSignatures', item: label });
        same(o, nw, { list: 'compatibleSignatures', item: label });
      }
      return;
    }
    // Compiler-generated symbol members (`__@iterator@N`) get a fresh id per program, so their
    // names never match across the two builds; they are not part of the named public surface.
    const named = (checker: ts.TypeChecker, t: ts.Type) =>
      checker.getPropertiesOfType(t).filter((p) => !p.getName().startsWith('__@'));
    for (const p of named(newSide.checker, newType))
      if (!oldType.getProperty(p.getName()))
        report.addedExports.push(`${exportLabel}.${p.getName()}`);
    for (const p of named(oldSide.checker, oldType)) {
      const m = p.getName();
      const np = newType.getProperty(m);
      if (!np) {
        report.removedExports.push(`${exportLabel}.${m}`);
        continue;
      }
      const ot = oldSide.checker.getTypeOfSymbol(p);
      const nt = newSide.checker.getTypeOfSymbol(np);
      const mo = `(${o})['${m}']`;
      const mn = `(${nw})['${m}']`;
      if (ot.getCallSignatures().length) {
        callable(`${label}.${m}`, mo, mn, {
          compareResult: !hasNominalMembers(
            oldSide.checker,
            ot.getCallSignatures()[0].getReturnType()
          ),
          removedInputs: removedInputs(oldSide.checker, ot, newSide.checker, nt, 0),
          removedResults: removedResults(oldSide.checker, ot, newSide.checker, nt),
        });
      } else if (!hasNominalMembers(oldSide.checker, ot)) {
        assign(mn, mo, { list: 'breakingSignatures', item: `${label}.${m}` });
        same(mo, mn, { list: 'compatibleSignatures', item: `${label}.${m}` });
      }
    }
  };

  for (const [subpath, entry] of Object.entries(ENTRIES)) {
    const oldEx = oldSide.exports[entry];
    const newEx = newSide.exports[entry];
    const ns = entry.replace(/\W/g, '_');
    imports.push(
      `import type * as O_${ns} from '${relImport(checkDir, path.join(baselineAbs, entry))}';`,
      `import type * as N_${ns} from '${relImport(checkDir, path.join(currentAbs, entry))}';`
    );
    for (const name of oldEx.keys())
      if (!newEx.has(name)) report.removedExports.push(`${subpath}: ${name}`);
    for (const name of newEx.keys())
      if (!oldEx.has(name)) report.addedExports.push(`${subpath}: ${name}`);

    for (const [name, sym] of oldEx) {
      if (!newEx.has(name)) continue;
      const resolved = resolveAlias(oldSide.checker, sym);
      const newResolved = resolveAlias(newSide.checker, newEx.get(name)!);
      const label = `${subpath === '.' ? '' : `${subpath} `}${name}`;
      // The value side of an export is compared independently of its type side: a merged
      // `type X` + `const X` export keeps its name when only the value disappears.
      if (resolved.flags & ts.SymbolFlags.Value && !(newResolved.flags & ts.SymbolFlags.Value)) {
        report.removedExports.push(`${subpath}: ${name} (value)`);
      } else if (
        !(resolved.flags & ts.SymbolFlags.Value) &&
        newResolved.flags & ts.SymbolFlags.Value
      ) {
        // A value companion added to a type-only export is a new public API (additive).
        report.addedExports.push(`${subpath}: ${name} (value)`);
      } else if (
        resolved.flags & ts.SymbolFlags.Variable &&
        !(resolved.flags & ts.SymbolFlags.Function)
      ) {
        valueMembers(
          label,
          `typeof O_${ns}.${name}`,
          `typeof N_${ns}.${name}`,
          oldSide.checker.getTypeOfSymbol(resolved),
          newSide.checker.getTypeOfSymbol(newResolved),
          `${subpath}: ${name}`
        );
      }
      if (resolved.flags & ts.SymbolFlags.Function) {
        const sig = oldSide.checker.getTypeOfSymbol(resolved).getCallSignatures()[0];
        const firstParam = sig?.parameters[0];
        const takesCore =
          firstParam !== undefined &&
          hasNominalMembers(oldSide.checker, oldSide.checker.getTypeOfSymbol(firstParam));
        const returnsRuntimeClass =
          sig !== undefined && hasNominalMembers(oldSide.checker, sig.getReturnType());
        const oldFnType = oldSide.checker.getTypeOfSymbol(resolved);
        const newFnType =
          newResolved.flags & ts.SymbolFlags.Function
            ? newSide.checker.getTypeOfSymbol(newResolved)
            : undefined;
        callable(label, `typeof O_${ns}.${name}`, `typeof N_${ns}.${name}`, {
          params: takesCore ? '_Op' : '_P',
          compareResult: !returnsRuntimeClass,
          removedInputs: newFnType
            ? removedInputs(
                oldSide.checker,
                oldFnType,
                newSide.checker,
                newFnType,
                takesCore ? 1 : 0
              )
            : [],
          removedResults:
            newFnType && !returnsRuntimeClass
              ? removedResults(oldSide.checker, oldFnType, newSide.checker, newFnType)
              : [],
        });
      } else if (
        resolved.flags &
          (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface | ts.SymbolFlags.Enum) &&
        !(resolved.flags & ts.SymbolFlags.Class) &&
        !isGenericType(resolved) &&
        !hasNominalMembers(oldSide.checker, oldSide.checker.getDeclaredTypeOfSymbol(resolved))
      ) {
        const o = `O_${ns}.${name}`;
        const nw = `N_${ns}.${name}`;
        const onFail = { list: 'changedTypes', item: label } as const;
        if (containsEnum(oldSide.checker, oldSide.checker.getDeclaredTypeOfSymbol(resolved))) {
          assign(`[${o}]`, `[${nw}]`, onFail);
          assign(`[${nw}]`, `[${o}]`, onFail);
          if (!(resolved.flags & ts.SymbolFlags.Enum)) same(`keyof ${o}`, `keyof ${nw}`, onFail);
        } else {
          same(o, nw, onFail);
        }
      }
    }
  }

  for (const name of oldSide.methods.keys())
    if (!newSide.methods.has(name)) report.removedMethods.push(name);
  for (const name of newSide.methods.keys())
    if (!oldSide.methods.has(name)) report.addedMethods.push(name);
  for (const [name, info] of oldSide.methods) {
    const newInfo = newSide.methods.get(name);
    if (!newInfo) continue;
    const o = `O_index.HubClient['${name}']`;
    const nw = `N_index.HubClient['${name}']`;
    callable(`HubClient.${name}`, o, nw, {
      removedInputs: removedInputs(oldSide.checker, info.type, newSide.checker, newInfo.type, 0),
      removedResults: removedResults(oldSide.checker, info.type, newSide.checker, newInfo.type),
    });
    // A newly added pagination API is a new public surface (additive).
    if (!info.paginate && newInfo.paginate) report.addedMethods.push(`${name}.paginate`);
    if (info.paginate) {
      if (!newInfo.paginate) report.removedMethods.push(`${name}.paginate`);
      else {
        const pg = (side: typeof oldSide, t: ts.Type) =>
          side.checker.getTypeOfSymbol(t.getProperty('paginate')!);
        callable(`HubClient.${name}.paginate`, `${o}['paginate']`, `${nw}['paginate']`, {
          removedInputs: removedInputs(
            oldSide.checker,
            pg(oldSide, info.type),
            newSide.checker,
            pg(newSide, newInfo.type),
            0
          ),
          removedResults: removedResults(
            oldSide.checker,
            pg(oldSide, info.type),
            newSide.checker,
            pg(newSide, newInfo.type)
          ),
        });
      }
    }
  }

  // One assertion per line, so each diagnostic maps back to exactly one check.
  const header = [...imports, ...helpers];
  const source = [...header, ...checks.map((c) => c.line)].join('\n');
  const checkFile = path.join(checkDir, '__api-compat-check.ts');
  fs.writeFileSync(checkFile, source);
  try {
    const program = ts.createProgram([checkFile], {
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022,
      types: [],
    });
    const sf = program.getSourceFile(checkFile);
    if (!sf) throw new Error('compat check file was not loaded');
    const failedLines = new Set<number>();
    for (const d of program.getSemanticDiagnostics(sf)) {
      if (d.start === undefined) continue;
      const { line } = sf.getLineAndCharacterOfPosition(d.start);
      if (line < header.length) {
        // An import or helper failed: the comparison itself is broken.
        throw new Error(
          `compat check setup failed: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`
        );
      }
      failedLines.add(line - header.length);
    }
    for (const i of failedLines) {
      const { list, item } = checks[i].onFail;
      const arr = report[list] as string[];
      if (!arr.includes(item)) arr.push(item);
    }
  } finally {
    fs.rmSync(checkFile, { force: true });
  }

  // A breaking signature is not identical either; list it once, as breaking.
  report.compatibleSignatures = report.compatibleSignatures.filter(
    (s) => !report.breakingSignatures.includes(s)
  );
  for (const k of Object.keys(report) as (keyof CompatReport)[]) {
    const v = report[k];
    if (Array.isArray(v)) v.sort();
  }

  if (
    report.removedExports.length ||
    report.removedMethods.length ||
    report.breakingSignatures.length
  )
    report.decision = 'breaking';
  else if (
    report.addedExports.length ||
    report.addedMethods.length ||
    report.compatibleSignatures.length ||
    report.changedTypes.length
  )
    report.decision = 'additive';
  return report;
}

export function toMarkdown(r: CompatReport): string {
  const section = (title: string, items: string[]) =>
    items.length
      ? `**${title}** (${items.length})\n\n${items.map((i) => `- \`${i}\``).join('\n')}\n`
      : '';
  const verdict = {
    none: 'No change to the public TypeScript API.',
    additive: 'The public TypeScript API changed in a backward-compatible way.',
    breaking: 'The public TypeScript API changed in a **breaking** way.',
  }[r.decision];
  const sections = [
    section('Removed exports', r.removedExports),
    section('Removed client methods', r.removedMethods),
    section('Breaking signature changes', r.breakingSignatures),
    section('Added exports', r.addedExports),
    section('Added client methods', r.addedMethods),
    section('Compatible signature changes', r.compatibleSignatures),
    section('Changed exported types (review how they are used)', r.changedTypes),
  ].filter((s) => s !== '');
  return [verdict, ...sections].join('\n');
}

async function main() {
  const baseline = arg('baseline');
  if (!baseline) {
    console.error(
      'Usage: tsx scripts/api-compat.ts --baseline <dir> [--current dist] [--out-json f] [--out-md f]'
    );
    process.exit(2);
  }
  const report = compareApis(baseline, arg('current') ?? 'dist');
  const outJson = arg('out-json');
  const outMd = arg('out-md');
  if (outJson) fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  if (outMd) fs.writeFileSync(outMd, `${toMarkdown(report)}\n`);
  console.log(toMarkdown(report));
  console.log(`decision=${report.decision}`);
  if (process.env.GITHUB_OUTPUT)
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `decision=${report.decision}\n`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('api-compat.ts')) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
