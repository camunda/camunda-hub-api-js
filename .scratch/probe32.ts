import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const base = '.scratch/probe32';
fs.rmSync(base, { recursive: true, force: true });
fs.mkdirSync(`${base}/o/fn`, { recursive: true });
fs.mkdirSync(`${base}/n/fn`, { recursive: true });
for (const side of ['o', 'n']) {
  const nameType = side === 'o' ? 'name: string;' : 'name?: string;';
  fs.writeFileSync(`${base}/${side}/index.d.ts`, `declare class HubCore { private readonly secret; configure(): void; }
export interface ProjectCreateRequest { name: string; description?: string; }
export interface ProjectResult { projectKey: string; ${nameType} }
declare class HubClientBase extends HubCore {
  createProject(input: ProjectCreateRequest): Promise<ProjectResult>;
}
export type HubClient = HubClientBase;
export declare function createHubClient(): HubClient;
export { HubCore, HubClientBase };
`);
  fs.writeFileSync(`${base}/${side}/logger.d.ts`, 'export declare function createLogger(): void;\n');
  fs.writeFileSync(`${base}/${side}/fn/index.d.ts`, `import type { HubCore, ProjectCreateRequest, ProjectResult } from '../index';
export declare function createProject(core: HubCore, input: ProjectCreateRequest): Promise<ProjectResult>;
`);
}
fs.writeFileSync(`${base}/check.ts`, `import type * as O_fn_index from './o/fn/index';
import type * as N_fn_index from './n/fn/index';
type _A<F> = F extends (...a: any) => infer X ? Awaited<X> : never;
declare const _c11: _A<typeof N_fn_index.createProject>; const _c11_ok: _A<typeof O_fn_index.createProject> = _c11;
`);
const program = ts.createProgram([`${base}/check.ts`], {
  strict: true, skipLibCheck: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile(`${base}/check.ts`)!;
for (const d of program.getSemanticDiagnostics(sf)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
console.log('done');
