import ts from 'typescript';
import fs from 'node:fs';

const code = `
type A = { kind: 'a'; tag?: string };
type B = { kind: 'b'; tag?: string };
type A2 = { kind: 'a' | 'c'; tag?: string };
type U_old = A | B;
type U_new = A2 | B;
declare const uo: U_old;
declare const un: U_new;
const t1: U_new = uo;      // old -> new (widening): expect OK
const t2: U_old = un;      // new -> old: expect error
const t3: A = {} as A2;    // branch new -> old: expect error
const t4: A2 = {} as A;    // branch old -> new: expect OK
type IA = { kind: 'a' } & { tag?: string };
type IB = { kind: 'b' } & { tag?: string };
type IA2 = { kind: 'a' | 'c' } & { tag?: string };
type IU_old = IA | IB;
type IU_new = IA2 | IB;
declare const iuo: IU_old;
declare const iun: IU_new;
const t5: IU_new = iuo;  // expect OK?
const t6: IU_old = iun;  // expect error?
// array-of-union
declare const ao: { items: U_old[] };
declare const an: { items: U_new[] };
const t7: typeof an = ao; // old -> new expect OK
const t8: typeof ao = an; // new -> old expect error
`;
fs.writeFileSync('.scratch/probe-src.ts', code);
const program = ts.createProgram(['.scratch/probe-src.ts'], { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022 });
const diags = program.getSemanticDiagnostics();
for (const d of diags) {
  const sf = d.file!;
  const { line } = sf.getLineAndCharacterOfPosition(d.start!);
  console.log(`line ${line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
}
console.log('total diagnostics:', diags.length);
