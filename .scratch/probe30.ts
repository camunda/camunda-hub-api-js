import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe30', { recursive: true });
fs.writeFileSync('.scratch/probe30/o.d.ts', `export interface ProjectResult { projectKey: string; name: string; }
export declare function createProject(input: {}): Promise<ProjectResult>;
`);
fs.writeFileSync('.scratch/probe30/n.d.ts', `export interface ProjectResult { projectKey: string; name?: string; }
export declare function createProject(input: {}): Promise<ProjectResult>;
`);
fs.writeFileSync('.scratch/probe30/check.ts', `import type * as O from './o';
import type * as N from './n';
type _A<F> = F extends (...a: any) => infer X ? Awaited<X> : never;
declare const _c11: _A<typeof N.createProject>; const _c11_ok: _A<typeof O.createProject> = _c11;
const _c12: _Eq<_A<typeof O.createProject>, _A<typeof N.createProject>> = true;
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
`);
const program = ts.createProgram(['.scratch/probe30/check.ts'], {
  strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [],
});
const sf = program.getSourceFile('.scratch/probe30/check.ts')!;
for (const d of program.getSemanticDiagnostics(sf)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
console.log('done');
