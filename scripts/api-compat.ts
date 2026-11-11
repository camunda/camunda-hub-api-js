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
 *   result. The same applies to each search operation's `.paginate(...)`.
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

/** Callable members of HubClient (operations), excluding HubCore plumbing. */
function clientMethods(checker: ts.TypeChecker, exportsOfIndex: Map<string, ts.Symbol>) {
  const methods = new Map<string, { paginate: boolean }>();
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
    methods.set(name, { paginate: Boolean(t.getProperty('paginate')) });
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
    opts: { params?: '_P' | '_Op'; compareResult?: boolean } = {}
  ) => {
    const P = opts.params ?? '_P';
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
      const label = `${subpath === '.' ? '' : `${subpath} `}${name}`;
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
    callable(`HubClient.${name}`, o, nw);
    if (info.paginate) {
      if (!newInfo.paginate) report.removedMethods.push(`${name}.paginate`);
      else callable(`HubClient.${name}.paginate`, `${o}['paginate']`, `${nw}['paginate']`);
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
