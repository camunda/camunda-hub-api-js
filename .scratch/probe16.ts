import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe16', { recursive: true });
fs.writeFileSync('.scratch/probe16/check.ts', `
interface ProjectResult { projectKey: string; name: string; }
interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type EqW = _Eq<CancelablePromise<ProjectResult>, Promise<ProjectResult>>;
type Inner = Promise<ProjectResult> extends CancelablePromise<ProjectResult> ? never : unknown;
declare const i: Inner;
const p1: 'x' = i;   // error iff Inner = unknown
const p2: Inner = 'x'; // error iff Inner = never
`);
const program = ts.createProgram(['.scratch/probe16/check.ts'], {
  strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile('.scratch/probe16/check.ts')!;
for (const d of program.getSemanticDiagnostics(sf)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
console.log('done');
