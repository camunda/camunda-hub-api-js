import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = fs.mkdtempSync(path.join('.scratch', 'dbg14-'));
function build(response: string): string {
  const dir = path.join(root, `b${Math.random()}`);
  fs.mkdirSync(path.join(dir, 'fn'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.d.ts'), `declare class HubCore { private readonly secret; configure(): void; }
export interface ProjectCreateRequest { name: string; description?: string; }
export interface ProjectResult { ${response} }
declare class HubClientBase extends HubCore {
  createProject(input: ProjectCreateRequest): Promise<ProjectResult>;
  getInfo(): Promise<{ version: string }>;
}
export type HubClient = HubClientBase;
export declare function createHubClient(): HubClient;
export { HubCore, HubClientBase };
`);
  fs.writeFileSync(path.join(dir, 'logger.d.ts'), 'export declare function createLogger(): void;\n');
  fs.writeFileSync(path.join(dir, 'fn', 'index.d.ts'), `import type { HubCore, ProjectCreateRequest, ProjectResult } from '../index';
export declare function createProject(core: HubCore, input: ProjectCreateRequest): Promise<ProjectResult>;
`);
  return dir;
}
const oldD = build('projectKey: string; name: string;');
const newD = build('projectKey: string; name?: string;');

const loadSide = (dir: string) => {
  const files = ['index.d.ts', 'logger.d.ts', 'fn/index.d.ts'].map((e) => path.join(dir, e));
  const program = ts.createProgram(files, {
    strict: true, skipLibCheck: true, noEmit: true,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022,
  });
  return { checker: program.getTypeChecker(), program };
};
const o = loadSide(oldD);
const n = loadSide(newD);

const getClientMethod = (side: { checker: ts.TypeChecker; program: ts.Program }, dir: string) => {
  const sf = side.program.getSourceFile(path.join(dir, 'index.d.ts'))!;
  const exports = side.checker.getExportsOfModule(side.checker.getSymbolAtLocation(sf)!);
  const clientSym = exports.find(s => s.name === 'HubClient')!;
  const resolved = clientSym.flags & ts.SymbolFlags.Alias ? side.checker.getAliasedSymbol(clientSym) : clientSym;
  const clientType = side.checker.getDeclaredTypeOfSymbol(resolved);
  const method = clientType.getProperty('createProject')!;
  return side.checker.getTypeOfSymbol(method);
};

const oM = getClientMethod(o, oldD);
const nM = getClientMethod(n, newD);
const oAw = o.checker.getAwaitedType(oM.getCallSignatures()[0].getReturnType())!;
const nAw = n.checker.getAwaitedType(nM.getCallSignatures()[0].getReturnType())!;

// Simulate removedResults with the mode='result' logic inline
function walk(checker: ts.TypeChecker, t: ts.Type, prefix: string, paths: Set<string>, other?: { checker: ts.TypeChecker; t: ts.Type }, mode?: string): void {
  if (t.isUnion()) {
    if (other && !other.t.isUnion() && !(other.t.flags & ts.TypeFlags.Object)) {
      if (mode === 'result')
        for (const part of t.types)
          if (!checker.isTypeAssignableTo(part, other.t)) paths.add(prefix);
      return;
    }
    // simplified: no branch matching needed here
    for (const part of t.types) walk(checker, part, prefix, paths, other, mode);
    return;
  }
  if (!(t.flags & ts.TypeFlags.Object)) return;
  for (const p of checker.getPropertiesOfType(t)) {
    const path = `${prefix}.${p.getName()}`;
    paths.add(path);
    const op = other?.t.getProperty(p.getName());
    walk(checker, checker.getTypeOfSymbol(p), path, paths, other && op ? { checker: other.checker, t: other.checker.getTypeOfSymbol(op) } : undefined, mode);
  }
}

const oPaths = new Set<string>();
walk(o.checker, oAw, 'result', oPaths, { checker: n.checker, t: nAw }, 'result');
const nPaths = new Set<string>();
walk(n.checker, nAw, 'result', nPaths, { checker: o.checker, t: oAw }, 'result');
console.log('oPaths:', [...oPaths].sort());
console.log('nPaths:', [...nPaths].sort());
console.log('removed:', [...oPaths].filter(p => !nPaths.has(p)));
