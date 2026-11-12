import ts from 'typescript';
import fs from 'node:fs';

// Two "programs" worth of declarations in ONE program (like the compat check file).
fs.mkdirSync('.scratch/probe3', { recursive: true });
fs.writeFileSync('.scratch/probe3/o.d.ts', `export type A = { kind: 'a'; tag?: string };
export type B = { kind: 'b'; tag?: string };
export type U = A | B;
`);
fs.writeFileSync('.scratch/probe3/n.d.ts', `export type A2 = { kind: 'a' | 'c'; tag?: string };
export type B = { kind: 'b'; tag?: string };
export type U = A2 | B;
`);
fs.writeFileSync('.scratch/probe3/check.ts', `import type * as O from './o';
import type * as N from './n';
declare const uo: O.U;
declare const un: N.U;
const t1: N.U = uo;   // old union -> new union: OK expected
declare const a: O.A;
declare const a2: N.A2;
const t2: N.A2 = a;   // old branch -> new widened branch: OK expected
const t3: O.A = a2;   // new -> old: error expected
`);
const program = ts.createProgram(
  ['.scratch/probe3/check.ts'],
  { strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [] }
);
const sf = program.getSourceFile('.scratch/probe3/check.ts')!;
for (const d of program.getSemanticDiagnostics(sf)) {
  const { line } = d.file!.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
// Also test isTypeAssignableTo across the two modules' types
const checker = program.getTypeChecker();
const oSf = program.getSourceFile('.scratch/probe3/o.d.ts')!;
const nSf = program.getSourceFile('.scratch/probe3/n.d.ts')!;
const oSym = checker.getSymbolAtLocation(oSf)!;
const nSym = checker.getSymbolAtLocation(nSf)!;
const oA = checker.getDeclaredTypeOfSymbol(checker.getExportsOfModule(oSym).find(s => s.name === 'A')!);
const nA2 = checker.getDeclaredTypeOfSymbol(checker.getExportsOfModule(nSym).find(s => s.name === 'A2')!);
console.log('oA -> nA2 assignable:', checker.isTypeAssignableTo(oA, nA2));
console.log('nA2 -> oA assignable:', checker.isTypeAssignableTo(nA2, oA));
