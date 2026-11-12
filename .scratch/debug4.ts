import { compareApis } from '../scripts/api-compat';
import fs from 'node:fs';
import path from 'node:path';

const root = fs.mkdtempSync(path.join('.scratch', 'dbg4-'));
function build(response: string, extraMethods = 'getInfo(): Promise<{ version: string }>;', extraExports = ''): string {
  const dir = path.join(root, `b${Math.random()}`);
  fs.mkdirSync(path.join(dir, 'fn'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.d.ts'), `declare class HubCore { private readonly secret; configure(): void; }
export interface ProjectCreateRequest { name: string; description?: string; }
export interface ProjectResult { ${response} }
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

console.log('=== optional response removal ===');
let r = compareApis(build('projectKey: string; name: string;'), build('projectKey: string; name?: string;'));
console.log(JSON.stringify(r.breakingSignatures));

console.log('=== wrapper change ===');
r = compareApis(
  build('projectKey: string; name: string;', 'getInfo(): Promise<{ version: string }>; searchProjects(input: { name?: string }): CancelablePromise<ProjectResult>;', 'export interface CancelablePromise<T> extends Promise<T> { cancel(): void; }'),
  build('projectKey: string; name: string;', 'getInfo(): Promise<{ version: string }>; searchProjects(input: { name?: string }): Promise<ProjectResult>;')
);
console.log(JSON.stringify(r.breakingSignatures));

console.log('=== paginate added ===');
r = compareApis(
  build('projectKey: string; name: string;', 'searchProjects(input: { name?: string }): Promise<ProjectResult[]>;\ngetInfo(): Promise<{ version: string }>;'),
  build('projectKey: string; name: string;', 'searchProjects(input: { name?: string }): Promise<ProjectResult[]> & { paginate(input: { name?: string }): Promise<ProjectResult[]> };\ngetInfo(): Promise<{ version: string }>;')
);
console.log('decision:', r.decision, 'breaking:', JSON.stringify(r.breakingSignatures), 'addedMethods:', JSON.stringify(r.addedMethods));
