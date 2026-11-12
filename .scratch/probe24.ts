import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe24', { recursive: true });
fs.writeFileSync('.scratch/probe24/o.d.ts', `export interface R { name: string; }
`);
const program = ts.createProgram(['.scratch/probe24/o.d.ts'], {
  strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [],
});
const checker = program.getTypeChecker();
const sf = program.getSourceFile('.scratch/probe24/o.d.ts')!;
const R = checker.getDeclaredTypeOfSymbol(checker.getExportsOfModule(checker.getSymbolAtLocation(sf)!).find(s => s.name === 'R')!);
const p = R.getProperty('name')!;
const t = checker.getTypeOfSymbol(p);
console.log('typeToString:', checker.typeToString(t), 'flags:', t.flags, 'isUnion:', t.isUnion());
if (t.isUnion()) console.log('parts:', t.types.map(x => checker.typeToString(x)));
