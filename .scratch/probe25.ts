import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

fs.rmSync('.scratch/probe25', { recursive: true, force: true });
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
mk('.scratch/probe25/o', 'projectKey: string; name: string;');
mk('.scratch/probe25/n', 'projectKey: string; name?: string;');

const loadSide = (dir: string) => {
  const files = ['index.d.ts', 'logger.d.ts', 'fn/index.d.ts'].map((e) => path.join(dir, e));
  const program = ts.createProgram(files, {
    strict: true, skipLibCheck: true, noEmit: true,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022,
  });
  return { checker: program.getTypeChecker(), program };
};
const o = loadSide('.scratch/probe25/o');
const n = loadSide('.scratch/probe25/n');

const getClientMethod = (side: { checker: ts.TypeChecker; program: ts.Program }, dir: string) => {
  const sf = side.program.getSourceFile(path.join(dir, 'index.d.ts'))!;
  const exports = side.checker.getExportsOfModule(side.checker.getSymbolAtLocation(sf)!);
  const clientSym = exports.find(s => s.name === 'HubClient')!;
  const resolved = clientSym.flags & ts.SymbolFlags.Alias ? side.checker.getAliasedSymbol(clientSym) : clientSym;
  const clientType = side.checker.getDeclaredTypeOfSymbol(resolved);
  const method = clientType.getProperty('createProject')!;
  return side.checker.getTypeOfSymbol(method);
};

const oM = getClientMethod(o, '.scratch/probe25/o');
const nM = getClientMethod(n, '.scratch/probe25/n');
const oRet = oM.getCallSignatures()[0].getReturnType();
const nRet = nM.getCallSignatures()[0].getReturnType();
console.log('oRet:', o.checker.typeToString(oRet), 'hasThen:', Boolean(oRet.getProperty('then')));
console.log('nRet:', n.checker.typeToString(nRet), 'hasThen:', Boolean(nRet.getProperty('then')));
const oAw = o.checker.getAwaitedType(oRet);
const nAw = n.checker.getAwaitedType(nRet);
console.log('oAwaited:', oAw ? o.checker.typeToString(oAw) : 'undefined');
console.log('nAwaited:', nAw ? n.checker.typeToString(nAw) : 'undefined');
if (oAw && nAw) {
  const oName = o.checker.getTypeOfSymbol(oAw.getProperty('name')!);
  const nName = n.checker.getTypeOfSymbol(nAw.getProperty('name')!);
  console.log('oName:', o.checker.typeToString(oName), 'isUnion:', oName.isUnion());
  console.log('nName:', n.checker.typeToString(nName), 'isUnion:', nName.isUnion());
}
