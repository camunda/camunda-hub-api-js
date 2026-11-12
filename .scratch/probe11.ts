import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe11', { recursive: true });
fs.writeFileSync('.scratch/probe11/check.ts', `
interface ProjectResult { projectKey: string; name: string; }
interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
type C2 = Promise<ProjectResult> extends CancelablePromise<ProjectResult> ? never : unknown;
declare const v: C2;
const s: string = v;  // error iff C2 is unknown (never assignable to string too... use different probe)
const u: C2 = 'literal-string';  // error iff C2 is never; OK iff unknown
`);
const program = ts.createProgram(['.scratch/probe11/check.ts'], {
  strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile('.scratch/probe11/check.ts')!;
for (const d of program.getSemanticDiagnostics(sf)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
console.log('done');
