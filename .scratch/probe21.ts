import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

// Replicate loadSide exactly: three files per side, separate programs.
const mk = (dir: string) => {
  fs.mkdirSync(path.join(dir, 'fn'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.d.ts'), `declare class HubCore { private readonly secret; configure(): void; }
export interface ProjectCreateRequest { name: string; description?: string; }
export interface ProjectResult { projectKey: string; name: string; }
declare class HubClientBase extends HubCore {
  createProject(input: ProjectCreateRequest): Promise<ProjectResult>;
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
fs.rmSync('.scratch/probe21', { recursive: true, force: true });
mk('.scratch/probe21/o');
mk('.scratch/probe21/n');
// make n's name optional
let c = fs.readFileSync('.scratch/probe21/n/index.d.ts', 'utf8');
c = c.replace('name: string; }', 'name?: string; }');
fs.writeFileSync('.scratch/probe21/n/index.d.ts', c);

const loadSide = (dir: string) => {
  const files = ['index.d.ts', 'logger.d.ts', 'fn/index.d.ts'].map((e) => path.join(dir, e));
  const program = ts.createProgram(files, {
    strict: true, skipLibCheck: true, noEmit: true,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022,
  });
  return { checker: program.getTypeChecker(), program };
};
const o = loadSide('.scratch/probe21/o');
const n = loadSide('.scratch/probe21/n');

// get HubClient.createProject return type on each side (as resultPaths does)
const getMethodReturn = (side: { checker: ts.TypeChecker; program: ts.Program }, dir: string) => {
  const sf = side.program.getSourceFile(path.join(dir, 'index.d.ts'))!;
  const exports = side.checker.getExportsOfModule(side.checker.getSymbolAtLocation(sf)!);
  const clientSym = exports.find(s => s.name === 'HubClient')!;
  const clientType = side.checker.getDeclaredTypeOfSymbol(clientSym);
  const method = clientType.getProperty('createProject')!;
  const mt = side.checker.getTypeOfSymbol(method);
  const sig = mt.getCallSignatures()[0];
  return { ret: sig.getReturnType(), awaited: side.checker.getAwaitedType(sig.getReturnType())! };
};
const oR = getMethodReturn(o, '.scratch/probe21/o');
const nR = getMethodReturn(n, '.scratch/probe21/n');
console.log('o awaited:', o.checker.typeToString(oR.awaited));
console.log('n awaited:', n.checker.typeToString(nR.awaited));
const oName = o.checker.getTypeOfSymbol(oR.awaited.getProperty('name')!);
const nName = n.checker.getTypeOfSymbol(nR.awaited.getProperty('name')!);
console.log('oName:', o.checker.typeToString(oName), 'isUnion:', oName.isUnion());
console.log('nName:', n.checker.typeToString(nName), 'isUnion:', nName.isUnion());
const strPart = nName.types.find(t => t.flags & ts.TypeFlags.String)!;
console.log('oName -> strPart (nChecker):', n.checker.isTypeAssignableTo(oName, strPart));
console.log('oName -> strPart (oChecker):', o.checker.isTypeAssignableTo(oName, strPart));
