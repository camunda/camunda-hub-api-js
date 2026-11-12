import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = fs.mkdtempSync(path.join('.scratch', 'dbg10-'));
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

const origWrite = fs.writeFileSync;
const origRm = fs.rmSync;
let checkPath = '';
(fs as any).writeFileSync = (p: any, data: any, ...rest: any[]) => {
  if (String(p).endsWith('__api-compat-check.ts')) checkPath = String(p);
  return origWrite(p, data, ...rest);
};
(fs as any).rmSync = (p: any, ...rest: any[]) => {
  if (String(p).endsWith('__api-compat-check.ts')) return;
  return origRm(p, ...rest);
};
const { compareApis } = await import('../scripts/api-compat');
const r = compareApis(oldD, newD);
(fs as any).writeFileSync = origWrite;
(fs as any).rmSync = origRm;
console.log('breaking:', r.breakingSignatures);
console.log('oldD:', oldD, 'newD:', newD);
console.log('checkPath:', checkPath);

// Re-run the check file compilation and print the FULL diagnostic for line 23 (fn _A assign)
const program = ts.createProgram([checkPath], {
  strict: true, skipLibCheck: true, noEmit: true,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile(checkPath)!;
for (const d of program.getSemanticDiagnostics(sf)) {
  if (d.start === undefined) continue;
  const { line } = sf.getLineAndCharacterOfPosition(d.start);
  if (line === 23 || line === 29) {
    console.log(`=== line ${line} ===`);
    console.log(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  }
}
fs.rmSync(checkPath, { force: true });
