import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = fs.mkdtempSync(path.join('.scratch', 'dbg2-'));
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

// Reimplement signatureInputs path collection using the same code path as the module:
// import the module's internals via a tiny re-export hack is not possible; instead inline-test:
// load both sides and call the exported compareApis but first monkey-patch? Simplest: replicate
// the exact walk by importing the module and reaching in via (module as any) — functions are not exported.
// So instead: run compareApis and print; then separately verify paths via a copy of inputPaths here.
const m = await import('../scripts/api-compat');
const r = m.compareApis(oldD, newD);
console.log('breaking:', r.breakingSignatures);
