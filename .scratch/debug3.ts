import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = fs.mkdtempSync(path.join('.scratch', 'dbg3-'));
function build(request: string): string {
  const dir = path.join(root, `b${Math.random()}`);
  fs.mkdirSync(path.join(dir, 'fn'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.d.ts'), `declare class HubCore { private readonly secret; configure(): void; }
export interface ProjectCreateRequest { ${request} }
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
  return dir;
}
const oldD = build("name: string; target?: { kind: 'a'; tag?: string } | { kind: 'b'; tag?: string };");
const newD = build("name: string; target?: { kind: 'a' | 'c'; tag?: string } | { kind: 'b'; tag?: string };");

function loadSide(dir: string) {
  const files = ['index.d.ts', 'logger.d.ts', 'fn/index.d.ts'].map((e) => path.join(dir, e));
  const program = ts.createProgram(files, {
    strict: true, skipLibCheck: true, noEmit: true,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022,
  });
  return program.getTypeChecker();
}
const oldChecker = loadSide(oldD);
const newChecker = loadSide(newD);

// replicate: get HubClient.createProject param type on each side
function paramType(checker: ts.TypeChecker, dir: string) {
  const program = (checker as any).getProgram?.() ?? undefined;
  return undefined;
}
// Simpler: rebuild programs to get checkers with program access
function loadSide2(dir: string) {
  const files = ['index.d.ts', 'logger.d.ts', 'fn/index.d.ts'].map((e) => path.join(dir, e));
  const program = ts.createProgram(files, {
    strict: true, skipLibCheck: true, noEmit: true,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022,
  });
  return { checker: program.getTypeChecker(), program };
}
const o = loadSide2(oldD);
const n = loadSide2(newD);
function clientMethodParam(side: { checker: ts.TypeChecker; program: ts.Program }) {
  const sf = side.program.getSourceFile(path.join(oldD, 'index.d.ts')) ?? undefined;
  return undefined;
}
