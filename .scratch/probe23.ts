import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe23', { recursive: true });
fs.writeFileSync('.scratch/probe23/o.d.ts', `export interface R { name: string; nick?: string; }
`);
const program = ts.createProgram(['.scratch/probe23/o.d.ts'], {
  strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [],
});
const checker = program.getTypeChecker();
const sf = program.getSourceFile('.scratch/probe23/o.d.ts')!;
const R = checker.getDeclaredTypeOfSymbol(checker.getExportsOfModule(checker.getSymbolAtLocation(sf)!).find(s => s.name === 'R')!);
for (const propName of ['name', 'nick']) {
  const p = R.getProperty(propName)!;
  const t1 = checker.getTypeOfSymbol(p);
  const decl = p.declarations![0];
  const t2 = checker.getTypeOfSymbolAtLocation(p, decl);
  const t3 = ts.isPropertySignature(decl) && decl.type ? checker.getTypeFromTypeNode(decl.type) : undefined;
  console.log(propName, 'getTypeOfSymbol:', checker.typeToString(t1), '| atLocation:', checker.typeToString(t2), '| fromTypeNode:', t3 ? checker.typeToString(t3) : 'n/a');
}
