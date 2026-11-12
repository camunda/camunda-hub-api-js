import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe15', { recursive: true });
fs.writeFileSync('.scratch/probe15/check.ts', `
interface ProjectResult { projectKey: string; name: string; }
interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type EqW = _Eq<CancelablePromise<ProjectResult>, Promise<ProjectResult>>;
type C = EqW extends true ? unknown : Promise<ProjectResult> extends CancelablePromise<ProjectResult> ? never : unknown;
declare const c: C;
const probe1: 'x' = c;   // error iff C = unknown; OK iff C = never
const probe2: C = 'x';   // error iff C = never; OK iff C = unknown
`);
const program = ts.createProgram(['.scratch/probe15/check.ts'], {
  strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile('.scratch/probe15/check.ts')!;
for (const d of program.getSemanticDiagnostics(sf)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
console.log('done');
