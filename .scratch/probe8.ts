import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe8', { recursive: true });
fs.writeFileSync('.scratch/probe8/o.d.ts', `export interface ProjectResult { projectKey: string; name: string; }
export interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
export declare function searchProjects(input: { name?: string }): CancelablePromise<ProjectResult>;
`);
fs.writeFileSync('.scratch/probe8/n.d.ts', `export interface ProjectResult { projectKey: string; name: string; }
export declare function searchProjects(input: { name?: string }): Promise<ProjectResult>;
`);
fs.writeFileSync('.scratch/probe8/check.ts', `import type * as O from './o';
import type * as N from './n';
type _R<F> = F extends (...a: any) => infer X ? X : never;
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type W_C = _Eq<_R<typeof O.searchProjects>, _R<typeof N.searchProjects>> extends true ? unknown : _R<typeof N.searchProjects> extends _R<typeof O.searchProjects> ? never : unknown;
const W_v: W_C = undefined as never;
`);
const program = ts.createProgram(['.scratch/probe8/check.ts'], {
  strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile('.scratch/probe8/check.ts')!;
for (const d of program.getSemanticDiagnostics(sf)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
// inspect the conditional directly
const checker = program.getTypeChecker();
console.log('done');
