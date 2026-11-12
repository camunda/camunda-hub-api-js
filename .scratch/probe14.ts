import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe14', { recursive: true });
fs.writeFileSync('.scratch/probe14/check.ts', `
interface ProjectResult { projectKey: string; name: string; }
interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type EqW = _Eq<CancelablePromise<ProjectResult>, Promise<ProjectResult>>;
declare const eq: EqW;
const tru: true = eq;   // error iff EqW is false
type C1 = Promise<ProjectResult> extends CancelablePromise<ProjectResult> ? never : unknown;
declare const c1: C1;
const nev: 'x' = c1;    // error iff C1 is never... never IS assignable to 'x'. Use reverse:
const c1b: C1 = 'x';    // error iff C1 is never
`);
const program = ts.createProgram(['.scratch/probe14/check.ts'], {
  strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile('.scratch/probe14/check.ts')!;
for (const d of program.getSemanticDiagnostics(sf)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
console.log('done');
