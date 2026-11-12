import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = fs.mkdtempSync(path.join('.scratch', 'dbg8-'));
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

// capture the check file AND keep it (patch rmSync to no-op)
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
console.log('checkPath:', checkPath);

// Now re-run the check file compilation manually and print ALL diagnostics with line numbers
const program = ts.createProgram([checkPath], {
  strict: true, skipLibCheck: true, noEmit: true,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile(checkPath)!;
const header = 10; // imports (6) + helpers (5ish) — count from file
const lines = fs.readFileSync(checkPath, 'utf8').split('\n');
console.log('--- header lines ---');
lines.slice(0, 12).forEach((l, i) => console.log(i, ':', l.slice(0, 100)));
console.log('--- diagnostics ---');
for (const d of program.getSemanticDiagnostics(sf)) {
  if (d.start === undefined) continue;
  const { line } = sf.getLineAndCharacterOfPosition(d.start);
  console.log(`line ${line}: ${lines[line]?.slice(0, 90)}`);
  console.log(`   -> ${ts.flattenDiagnosticMessageText(d.messageText, ' ').slice(0, 160)}`);
}
fs.rmSync(checkPath, { force: true });
