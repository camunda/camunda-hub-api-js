import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe17', { recursive: true });
fs.writeFileSync('.scratch/probe17/o.d.ts', `export interface ProjectResult { projectKey: string; name: string; }
export interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
export declare function searchProjects(input: { name?: string }): CancelablePromise<ProjectResult>;
`);
fs.writeFileSync('.scratch/probe17/n.d.ts', `export interface ProjectResult { projectKey: string; name: string; }
export declare function searchProjects(input: { name?: string }): Promise<ProjectResult>;
`);
fs.writeFileSync('.scratch/probe17/check.ts', `import type * as O from './o';
import type * as N from './n';
type _R<F> = F extends (...a: any) => infer X ? X : never;
const _c0_v: _R<typeof O.searchProjects> = undefined as _R<typeof N.searchProjects>;
`);
const program = ts.createProgram(['.scratch/probe17/check.ts'], {
  strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile('.scratch/probe17/check.ts')!;
for (const d of program.getSemanticDiagnostics(sf)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
console.log('done');
