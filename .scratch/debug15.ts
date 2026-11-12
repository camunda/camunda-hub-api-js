import fs from 'node:fs';
import path from 'node:path';

const root = fs.mkdtempSync(path.join('.scratch', 'dbg15-'));
function build(extraMethods: string, extraExports = ''): string {
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
${extraExports}
export { HubCore, HubClientBase };
`);
  fs.writeFileSync(path.join(dir, 'logger.d.ts'), 'export declare function createLogger(): void;\n');
  fs.writeFileSync(path.join(dir, 'fn', 'index.d.ts'), `import type { HubCore, ProjectCreateRequest, ProjectResult } from '../index';
export declare function createProject(core: HubCore, input: ProjectCreateRequest): Promise<ProjectResult>;
`);
  return dir;
}

const origWrite = fs.writeFileSync;
let captured = '';
(fs as any).writeFileSync = (p: any, data: any, ...rest: any[]) => {
  if (String(p).endsWith('__api-compat-check.ts')) captured = String(data);
  return origWrite(p, data, ...rest);
};
const { compareApis } = await import('../scripts/api-compat');
const r = compareApis(
  build('getInfo(): Promise<{ version: string }>; searchProjects(input: { name?: string }): CancelablePromise<ProjectResult>;', 'export interface CancelablePromise<T> extends Promise<T> { cancel(): void; }'),
  build('getInfo(): Promise<{ version: string }>; searchProjects(input: { name?: string }): Promise<ProjectResult>;')
);
(fs as any).writeFileSync = origWrite;
console.log('breaking:', r.breakingSignatures);
const lines = captured.split('\n');
for (const i of [30, 31]) console.log(`check ${i} (line ${11 + i}):`, lines[11 + i]);
