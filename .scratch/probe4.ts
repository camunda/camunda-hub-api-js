import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe4', { recursive: true });
fs.writeFileSync('.scratch/probe4/o.d.ts', `export type A = { kind: 'a'; tag?: string };
export type B = { kind: 'b'; tag?: string };
export type U = A | B;
`);
fs.writeFileSync('.scratch/probe4/n.d.ts', `export type A2 = { kind: 'a' | 'c'; tag?: string };
export type B = { kind: 'b'; tag?: string };
export type U = A2 | B;
`);
const program = ts.createProgram(
  ['.scratch/probe4/o.d.ts', '.scratch/probe4/n.d.ts'],
  { strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [] }
);
const checker = program.getTypeChecker();
const getExports = (f: string) => {
  const sf = program.getSourceFile(f)!;
  return checker.getExportsOfModule(checker.getSymbolAtLocation(sf)!);
};
const oU = checker.getDeclaredTypeOfSymbol(getExports('.scratch/probe4/o.d.ts').find(s => s.name === 'U')!);
const nU = checker.getDeclaredTypeOfSymbol(getExports('.scratch/probe4/n.d.ts').find(s => s.name === 'U')!);
console.log('oU isUnion:', oU.isUnion(), 'nU isUnion:', nU.isUnion());
const oA = oU.types[0];
const nParts = nU.types;
console.log('oA:', checker.typeToString(oA));
for (const q of nParts) {
  console.log('  nPart:', checker.typeToString(q),
    'oA->q:', checker.isTypeAssignableTo(oA, q),
    'q->oA:', checker.isTypeAssignableTo(q, oA));
}
// optional property type: what does getTypeOfSymbol give for tag?: string
const tag = oA.getProperty('tag')!;
const tagT = checker.getTypeOfSymbol(tag);
console.log('tag type:', checker.typeToString(tagT), 'flags:', tagT.flags, 'isUnion:', tagT.isUnion());
const nn = checker.getNonNullableType(tagT);
console.log('nonNullable tag:', checker.typeToString(nn), 'flags:', nn.flags);
