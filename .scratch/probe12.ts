import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe12', { recursive: true });
fs.writeFileSync('.scratch/probe12/check.ts', `
interface ProjectResult { projectKey: string; name: string; }
interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type EqW = _Eq<CancelablePromise<ProjectResult>, Promise<ProjectResult>>;
type C = EqW extends true ? unknown : Promise<ProjectResult> extends CancelablePromise<ProjectResult> ? never : unknown;
const probe: C = 'x';  // error iff C resolves to never
`);
const program = ts.createProgram(['.scratch/probe12/check.ts'], {
  strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile('.scratch/probe12/check.ts')!;
for (const d of program.getSemanticDiagnostics(sf)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
console.log('done');
