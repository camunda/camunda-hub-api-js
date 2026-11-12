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
 * Property paths a caller may write in an argument of type `t` (for example `arg0.description`
 * or `arg0.filter.name`). Object literals are checked for excess properties, so a path that
 * disappears breaks existing calls even though the old argument type is still assignable to the
 * new one. `open` collects paths below which any key is accepted (index signatures, `any`,
 * `unknown`, `object`), so a removed key under them is not a break.
 */
function inputPaths(
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
  if (t.isUnionOrIntersection()) {
    for (const part of t.types) inputPaths(checker, part, prefix, paths, open, depth, seen);
    return;
  }
  if (!(t.flags & ts.TypeFlags.Object)) return;
  if (t.getCallSignatures().length || t.getConstructSignatures().length) return;
  const next = new Set(seen).add(t);
  if (checker.isArrayType(t) || checker.isTupleType(t)) {
    for (const el of checker.getTypeArguments(t as ts.TypeReference))
      inputPaths(checker, el, `${prefix}[]`, paths, open, depth - 1, next);
    return;
  }
  if (checker.getIndexInfosOfType(t).length) open.add(prefix);
  for (const p of checker.getPropertiesOfType(t)) {
    const path = `${prefix}.${p.getName()}`;
    paths.add(path);
    inputPaths(checker, checker.getTypeOfSymbol(p), path, paths, open, depth - 1, next);
  }
}

/** Argument property paths of a callable type, skipping the first `skip` parameters. */
function signatureInputs(checker: ts.TypeChecker, t: ts.Type, skip: number) {
  const paths = new Set<string>();
  const open = new Set<string>();
  for (const sig of t.getCallSignatures())
    sig.parameters
      .slice(skip)
      .forEach((p, i) => inputPaths(checker, checker.getTypeOfSymbol(p), `arg${i}`, paths, open));
  return { paths, open };
}

/** Input paths the old callable accepted that the new one no longer accepts. */
function removedInputs(
  oldChecker: ts.TypeChecker,
  oldType: ts.Type,
  newChecker: ts.TypeChecker,
  newType: ts.Type,
  skip: number
): string[] {
  const o = signatureInputs(oldChecker, oldType, skip);
  const nw = signatureInputs(newChecker, newType, skip);
  const isOpen = (p: string) => {
    for (let q = p; q.includes('.'); ) {
      q = q.slice(0, q.lastIndexOf('.'));
      if (nw.open.has(q)) return true;
    }
    return false;
  };
  return [...o.paths].filter((p) => !nw.paths.has(p) && !isOpen(p)).sort();
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
    methods.set(name, { paginate: Boolean(t.getProperty('paginate')), type: t });
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
  return { checker, exports, methods: clientMethods(checker, exports[CORE_ENTRY]) };
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
    // `/fn` operations take the runtime core first; compare the operation arguments after it.
    'type _Op<F> = _P<F> extends [any, ...infer Rest] ? Rest : never;',
    // Exact type identity (also sees added optional properties, which assignability ignores).
    'type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;',
  ];

  /** Old value of type `from` must be assignable to `to`. */
  const assign = (from: string, to: string, onFail: Check['onFail']) => {
    const a = id();
    checks.push({ line: `declare const ${a}: ${from}; const ${a}_ok: ${to} = ${a};`, onFail });
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
    opts: { params?: '_P' | '_Op'; compareResult?: boolean; removedInputs?: string[] } = {}
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
    assign(`_R<${nw}>`, `_R<${o}>`, { list: 'breakingSignatures', item: `${label} (result)` });
    same(`_R<${o}>`, `_R<${nw}>`, { list: 'compatibleSignatures', item: `${label} (result)` });
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
      });
    }
    for (const p of oldSide.checker.getPropertiesOfType(oldType)) {
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
        callable(label, `typeof O_${ns}.${name}`, `typeof N_${ns}.${name}`, {
          params: takesCore ? '_Op' : '_P',
          compareResult: !returnsRuntimeClass,
          removedInputs:
            newResolved.flags & ts.SymbolFlags.Function
              ? removedInputs(
                  oldSide.checker,
                  oldSide.checker.getTypeOfSymbol(resolved),
                  newSide.checker,
                  newSide.checker.getTypeOfSymbol(newResolved),
                  takesCore ? 1 : 0
                )
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
    });
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
