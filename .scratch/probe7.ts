import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe7', { recursive: true });
fs.writeFileSync('.scratch/probe7/o.d.ts', `export interface ProjectResult { projectKey: string; name: string; }
export interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
export declare function searchProjects(input: { name?: string }): CancelablePromise<ProjectResult>;
`);
fs.writeFileSync('.scratch/probe7/n.d.ts', `export interface ProjectResult { projectKey: string; name: string; }
export declare function searchProjects(input: { name?: string }): Promise<ProjectResult>;
`);
fs.writeFileSync('.scratch/probe7/check.ts', `import type * as O from './o';
import type * as N from './n';
type _R<F> = F extends (...a: any) => infer X ? X : never;
declare const a: _R<typeof O.searchProjects>;
const a_ok: _R<typeof N.searchProjects> = a;
declare const b: _R<typeof N.searchProjects>;
const b_ok: _R<typeof O.searchProjects> = b;
`);
const program = ts.createProgram(['.scratch/probe7/check.ts'], {
  strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile('.scratch/probe7/check.ts')!;
for (const d of program.getSemanticDiagnostics(sf)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
console.log('--- intersection case ---');
fs.writeFileSync('.scratch/probe7/o2.d.ts', `export interface ProjectResult { projectKey: string; name: string; }
export declare function searchProjects(input: { name?: string }): Promise<ProjectResult[]>;
`);
fs.writeFileSync('.scratch/probe7/n2.d.ts', `export interface ProjectResult { projectKey: string; name: string; }
export declare function searchProjects(input: { name?: string }): Promise<ProjectResult[]> & { paginate(input: { name?: string }): Promise<ProjectResult[]> };
`);
fs.writeFileSync('.scratch/probe7/check2.ts', `import type * as O from './o2';
import type * as N from './n2';
type _R<F> = F extends (...a: any) => infer X ? X : never;
declare const a: _R<typeof O.searchProjects>;
const a_ok: _R<typeof N.searchProjects> = a;
`);
const program2 = ts.createProgram(['.scratch/probe7/check2.ts'], {
  strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [],
});
const sf2 = program2.getSourceFile('.scratch/probe7/check2.ts')!;
for (const d of program2.getSemanticDiagnostics(sf2)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
console.log('done');
