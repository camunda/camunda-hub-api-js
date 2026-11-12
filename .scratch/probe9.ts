import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe9', { recursive: true });
fs.writeFileSync('.scratch/probe9/check.ts', `
interface ProjectResult { projectKey: string; name: string; }
interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Eq1 = _Eq<CancelablePromise<ProjectResult>, Promise<ProjectResult>>;
const e1: Eq1 = false;  // if _Eq works, Eq1 = false, so this passes
type C1 = _Eq<CancelablePromise<ProjectResult>, Promise<ProjectResult>> extends true ? unknown : Promise<ProjectResult> extends CancelablePromise<ProjectResult> ? never : unknown;
const c1: C1 = undefined as never;  // expect error if C1 = never
type C2 = false extends true ? unknown : Promise<ProjectResult> extends CancelablePromise<ProjectResult> ? never : unknown;
const c2: C2 = undefined as never;  // expect error (C2 = never)
`);
const program = ts.createProgram(['.scratch/probe9/check.ts'], {
  strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile('.scratch/probe9/check.ts')!;
for (const d of program.getSemanticDiagnostics(sf)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
console.log('done');
