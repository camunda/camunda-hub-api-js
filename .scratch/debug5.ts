import { compareApis } from '../scripts/api-compat';
import fs from 'node:fs';
import path from 'node:path';

const root = fs.mkdtempSync(path.join('.scratch', 'dbg5-'));
function build(extraMethods: string): string {
  const dir = path.join(root, `b${Math.random()}`);
  fs.mkdirSync(path.join(dir, 'fn'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.d.ts'), `declare class HubCore { private readonly secret; configure(): void; }
export interface ProjectCreateRequest { name: string; description?: string; }
export interface ProjectResult { projectKey: string; name: string; }
declare class HubClientBase extends HubCore {
  createProject(input: ProjectCreateRequest): Promise<ProjectResult>;
  ${extraMethods}
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

// Intercept the check file: monkey-patch fs.rmSync? Instead set a hook: copy compareApis? Simplest:
// patch fs.writeFileSync to capture the check file content.
const origWrite = fs.writeFileSync;
let captured = '';
(fs as any).writeFileSync = (p: any, data: any, ...rest: any[]) => {
  if (String(p).endsWith('__api-compat-check.ts')) captured = String(data);
  return origWrite(p, data, ...rest);
};
const r = compareApis(
  build('searchProjects(input: { name?: string }): Promise<ProjectResult[]>;\ngetInfo(): Promise<{ version: string }>;'),
  build('searchProjects(input: { name?: string }): Promise<ProjectResult[]> & { paginate(input: { name?: string }): Promise<ProjectResult[]> };\ngetInfo(): Promise<{ version: string }>;')
);
(fs as any).writeFileSync = origWrite;
console.log('breaking:', r.breakingSignatures);
console.log('--- check lines mentioning searchProjects ---');
for (const line of captured.split('\n')) if (line.includes('searchProjects')) console.log(line);
