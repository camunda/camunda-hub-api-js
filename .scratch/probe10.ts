import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe10', { recursive: true });
fs.writeFileSync('.scratch/probe10/check.ts', `
interface ProjectResult { projectKey: string; name: string; }
interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
// direct assignment checks
declare const cp: CancelablePromise<ProjectResult>;
declare const p: Promise<ProjectResult>;
const d1: Promise<ProjectResult> = cp;   // expect OK
const d2: CancelablePromise<ProjectResult> = p;  // expect error
// does _Eq see them as identical?
const e1: _Eq<CancelablePromise<ProjectResult>, Promise<ProjectResult>> = true;  // error if not identical
const e2: _Eq<CancelablePromise<ProjectResult>, Promise<ProjectResult>> = false; // error if identical
// conditional assignability
type C2 = Promise<ProjectResult> extends CancelablePromise<ProjectResult> ? never : unknown;
const c2a: C2 = 1 as unknown as never;  // error iff C2 = unknown
const c2b: C2 = 'hello' as any;
`);
const program = ts.createProgram(['.scratch/probe10/check.ts'], {
  strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile('.scratch/probe10/check.ts')!;
for (const d of program.getSemanticDiagnostics(sf)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
console.log('done');
