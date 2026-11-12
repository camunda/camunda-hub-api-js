import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe6', { recursive: true });
fs.writeFileSync('.scratch/probe6/o.d.ts', `export type A = { kind: 'a'; tag?: string };
export type B = { kind: 'b'; tag?: string };
export type U = A | B;
`);
fs.writeFileSync('.scratch/probe6/n.d.ts', `export type A2 = { kind: 'a' | 'c'; tag?: string };
export type B = { kind: 'b'; tag?: string };
export type U = A2 | B;
`);
const program = ts.createProgram(
  ['.scratch/probe6/o.d.ts', '.scratch/probe6/n.d.ts'],
  { strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [] }
);
const checker = program.getTypeChecker();
const getExports = (f: string) => {
  const sf = program.getSourceFile(f)!;
  return checker.getExportsOfModule(checker.getSymbolAtLocation(sf)!);
};
const oU = checker.getDeclaredTypeOfSymbol(getExports('.scratch/probe6/o.d.ts').find(s => s.name === 'U')!);
const nU = checker.getDeclaredTypeOfSymbol(getExports('.scratch/probe6/n.d.ts').find(s => s.name === 'U')!);
for (const p of nU.types) {
  console.log('nPart:', checker.typeToString(p), 'flags:', p.flags, 'isObject:', Boolean(p.flags & ts.TypeFlags.Object));
}
const nA2 = nU.types[0];

for (const q of oU.types) {
  console.log('  oPart:', checker.typeToString(q), 'q->nA2:', checker.isTypeAssignableTo(q, nA2));
}
