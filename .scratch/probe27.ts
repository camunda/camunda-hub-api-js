import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

fs.rmSync('.scratch/probe27', { recursive: true, force: true });
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
mk('.scratch/probe27/o', 'projectKey: string; name: string;');
mk('.scratch/probe27/n', 'projectKey: string; name?: string;');

const loadSide = (dir: string) => {
  const files = ['index.d.ts', 'logger.d.ts', 'fn/index.d.ts'].map((e) => path.join(dir, e));
  const program = ts.createProgram(files, {
    strict: true, skipLibCheck: true, noEmit: true,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022,
  });
  return { checker: program.getTypeChecker(), program };
};
const o = loadSide('.scratch/probe27/o');
const n = loadSide('.scratch/probe27/n');

const getClientMethod = (side: { checker: ts.TypeChecker; program: ts.Program }, dir: string) => {
  const sf = side.program.getSourceFile(path.join(dir, 'index.d.ts'))!;
  const exports = side.checker.getExportsOfModule(side.checker.getSymbolAtLocation(sf)!);
  const clientSym = exports.find(s => s.name === 'HubClient')!;
  const resolved = clientSym.flags & ts.SymbolFlags.Alias ? side.checker.getAliasedSymbol(clientSym) : clientSym;
  const clientType = side.checker.getDeclaredTypeOfSymbol(resolved);
  const method = clientType.getProperty('createProject')!;
  return side.checker.getTypeOfSymbol(method);
};

const oM = getClientMethod(o, '.scratch/probe27/o');
const nM = getClientMethod(n, '.scratch/probe27/n');
const oAw = o.checker.getAwaitedType(oM.getCallSignatures()[0].getReturnType())!;
const nAw = n.checker.getAwaitedType(nM.getCallSignatures()[0].getReturnType())!;

// simulate resultPaths FORWARD (old walk, other=new)
const oNameT = o.checker.getTypeOfSymbol(oAw.getProperty('name')!);
const nNameT = n.checker.getTypeOfSymbol(nAw.getProperty('name')!);
console.log('=== forward: oNameT vs nNameT ===');
console.log('oNameT isUnion:', oNameT.isUnion());
console.log('nNameT isUnion:', nNameT.isUnion());
// inputPaths(oChecker, oNameT, 'result.name', ..., other={nChecker, nNameT, forward})
// oNameT is not a union, not intersection, not object -> bail. path 'result.name' added by parent.
// simulate REVERSE (new walk, other=old)
console.log('=== reverse: nNameT vs oNameT ===');
// nNameT is union: parts undefined, string
for (const part of nNameT.types) {
  const isObj = Boolean(part.flags & ts.TypeFlags.Object);
  console.log('part:', n.checker.typeToString(part), 'isObj:', isObj);
  if (!isObj) {
    // kept logic
    const otherIsObj = Boolean(oNameT.flags & ts.TypeFlags.Object);
    const otherIsUnion = oNameT.isUnion();
    const assign = o.checker.isTypeAssignableTo(part, oNameT);
    const assignViaN = n.checker.isTypeAssignableTo(part, oNameT);
    console.log('  otherIsObj:', otherIsObj, 'otherIsUnion:', otherIsUnion, 'part->other (oChecker):', assign, '(nChecker):', assignViaN);
  }
}
