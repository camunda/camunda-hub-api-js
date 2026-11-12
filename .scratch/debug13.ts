import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = fs.mkdtempSync(path.join('.scratch', 'dbg13-'));
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

// load sides like loadSide does
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

// replicate inputPaths reverse walk on nAw with other=oAw
const nNameT = n.checker.getTypeOfSymbol(nAw.getProperty('name')!);
const oNameT = o.checker.getTypeOfSymbol(oAw.getProperty('name')!);
console.log('nNameT:', n.checker.typeToString(nNameT), 'isUnion:', nNameT.isUnion());
console.log('oNameT:', o.checker.typeToString(oNameT), 'isUnion:', oNameT.isUnion());
console.log('oNameT isObject:', Boolean(oNameT.flags & ts.TypeFlags.Object));
for (const part of nNameT.types) {
  console.log('  part:', n.checker.typeToString(part), '-> oNameT:', n.checker.isTypeAssignableTo(part, oNameT));
}
