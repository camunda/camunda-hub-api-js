import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

fs.rmSync('.scratch/probe33', { recursive: true, force: true });
const dir = '.scratch/probe33/n';
fs.mkdirSync(path.join(dir, 'fn'), { recursive: true });
fs.writeFileSync(path.join(dir, 'index.d.ts'), `declare class HubCore { private readonly secret; configure(): void; }
export interface ProjectCreateRequest { name: string; description?: string; }
export interface ProjectResult { projectKey: string; name: string; }
declare class HubClientBase extends HubCore {
  createProject(input: ProjectCreateRequest): Promise<ProjectResult>;
  searchProjects(input: { name?: string }): Promise<ProjectResult[]> & { paginate(input: { name?: string }): Promise<ProjectResult[]> };
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

const program = ts.createProgram(
  ['index.d.ts', 'logger.d.ts', 'fn/index.d.ts'].map((e) => path.join(dir, e)),
  { strict: true, skipLibCheck: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022 }
);
const checker = program.getTypeChecker();
const sf = program.getSourceFile(path.join(dir, 'index.d.ts'))!;
const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(sf)!);
const clientSym = exports.find(s => s.name === 'HubClient')!;
const clientType = checker.getDeclaredTypeOfSymbol(clientSym);
const method = clientType.getProperty('searchProjects')!;
const t = checker.getTypeOfSymbol(method);
console.log('type:', checker.typeToString(t));
console.log('isIntersection:', t.isIntersection());
console.log('paginate prop:', Boolean(t.getProperty('paginate')));
console.log('call sigs:', t.getCallSignatures().length);
