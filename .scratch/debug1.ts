import { compareApis } from '../scripts/api-compat';
import fs from 'node:fs';
import path from 'node:path';

const root = fs.mkdtempSync(path.join('.scratch', 'dbg-'));
function build(request: string, extraMethods = 'getInfo(): Promise<{ version: string }>;'): string {
  const dir = path.join(root, `b${Math.random()}`);
  fs.mkdirSync(path.join(dir, 'fn'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.d.ts'), `declare class HubCore { private readonly secret; configure(): void; }
export interface ProjectCreateRequest { ${request} }
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

const oldD = build("name: string; target?: { kind: 'a'; tag?: string } | { kind: 'b'; tag?: string };");
const newD = build("name: string; target?: { kind: 'a' | 'c'; tag?: string } | { kind: 'b'; tag?: string };");
const r = compareApis(oldD, newD);
console.log(JSON.stringify(r, null, 2));
