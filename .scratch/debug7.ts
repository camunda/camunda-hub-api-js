import fs from 'node:fs';
import path from 'node:path';

const root = fs.mkdtempSync(path.join('.scratch', 'dbg7-'));
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

// capture the check file
const origWrite = fs.writeFileSync;
let captured = '';
(fs as any).writeFileSync = (p: any, data: any, ...rest: any[]) => {
  if (String(p).endsWith('__api-compat-check.ts')) captured = String(data);
  return origWrite(p, data, ...rest);
};
const { compareApis } = await import('../scripts/api-compat');
const r = compareApis(oldD, newD);
(fs as any).writeFileSync = origWrite;
console.log('breaking:', r.breakingSignatures);
console.log('--- result-related check lines ---');
captured.split('\n').forEach((line, i) => {
  if (line.includes('result') || line.includes('_R<') || line.includes('_A<')) console.log(i, ':', line);
});
