import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

fs.rmSync('.scratch/probe26', { recursive: true, force: true });
const mk = (dir: string, response: string) => {
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
};
mk('.scratch/probe26/o', 'projectKey: string; name: string;');
mk('.scratch/probe26/n', 'projectKey: string; name?: string;');

const loadSide = (dir: string) => {
  const files = ['index.d.ts', 'logger.d.ts', 'fn/index.d.ts'].map((e) => path.join(dir, e));
  const program = ts.createProgram(files, {
    strict: true, skipLibCheck: true, noEmit: true,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022,
  });
  return { checker: program.getTypeChecker(), program };
};
const o = loadSide('.scratch/probe26/o');
const n = loadSide('.scratch/probe26/n');

const getClientMethod = (side: { checker: ts.TypeChecker; program: ts.Program }, dir: string) => {
  const sf = side.program.getSourceFile(path.join(dir, 'index.d.ts'))!;
  const exports = side.checker.getExportsOfModule(side.checker.getSymbolAtLocation(sf)!);
  const clientSym = exports.find(s => s.name === 'HubClient')!;
  const resolved = clientSym.flags & ts.SymbolFlags.Alias ? side.checker.getAliasedSymbol(clientSym) : clientSym;
  const clientType = side.checker.getDeclaredTypeOfSymbol(resolved);
  const method = clientType.getProperty('createProject')!;
  return side.checker.getTypeOfSymbol(method);
};

const oM = getClientMethod(o, '.scratch/probe26/o');
const nM = getClientMethod(n, '.scratch/probe26/n');
const oRet = oM.getCallSignatures()[0].getReturnType();
const nRet = nM.getCallSignatures()[0].getReturnType();
const oAw = o.checker.getAwaitedType(oRet)!;
const nAw = n.checker.getAwaitedType(nRet)!;

// Cross-program: old walk (o checker), other = new (n checker)
const oName = oAw.getProperty('name')!;
const oNameT = o.checker.getTypeOfSymbol(oName);
const nName = nAw.getProperty('name')!;
const nNameT = n.checker.getTypeOfSymbol(nName);
console.log('oNameT:', o.checker.typeToString(oNameT), 'isUnion:', oNameT.isUnion());
console.log('nNameT:', n.checker.typeToString(nNameT), 'isUnion:', nNameT.isUnion());
// the leaf check: part (oNameT=string) vs other.t (nNameT=string|undefined)
console.log('nNameT.isUnion():', nNameT.isUnion());
if (nNameT.isUnion()) {
  for (const q of nNameT.types) {
    console.log('  q:', n.checker.typeToString(q), 'Object?', Boolean(q.flags & ts.TypeFlags.Object), 'oNameT->q:', o.checker.isTypeAssignableTo(oNameT, q), 'via nChecker:', n.checker.isTypeAssignableTo(oNameT, q));
  }
}
