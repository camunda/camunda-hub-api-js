import { compareApis } from '../scripts/api-compat';
import fs from 'node:fs';
import path from 'node:path';

const root = fs.mkdtempSync(path.join('.scratch', 'dbg16-'));
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
const r = compareApis(
  build('searchProjects(input: { name?: string }): Promise<ProjectResult[]>;\ngetInfo(): Promise<{ version: string }>;'),
  build('searchProjects(input: { name?: string }): Promise<ProjectResult[]> & { paginate(input: { name?: string }): Promise<ProjectResult[]> };\ngetInfo(): Promise<{ version: string }>;')
);
console.log('decision:', r.decision);
console.log('addedMethods:', r.addedMethods);
console.log('compatibleSignatures:', r.compatibleSignatures);
