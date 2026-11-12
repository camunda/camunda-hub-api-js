import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe18', { recursive: true });
fs.writeFileSync('.scratch/probe18/o.d.ts', `export interface ProjectResult { projectKey: string; name: string; }
`);
fs.writeFileSync('.scratch/probe18/n.d.ts', `export interface ProjectResult { projectKey: string; name?: string; }
`);
const program = ts.createProgram(['.scratch/probe18/o.d.ts', '.scratch/probe18/n.d.ts'], {
  strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [],
});
const checker = program.getTypeChecker();
const getType = (f: string) => {
  const sf = program.getSourceFile(f)!;
  return checker.getDeclaredTypeOfSymbol(checker.getExportsOfModule(checker.getSymbolAtLocation(sf)!).find(s => s.name === 'ProjectResult')!);
};
const oT = getType('.scratch/probe18/o.d.ts');
const nT = getType('.scratch/probe18/n.d.ts');
const oName = checker.getTypeOfSymbol(oT.getProperty('name')!);
const nName = checker.getTypeOfSymbol(nT.getProperty('name')!);
console.log('oName:', checker.typeToString(oName), 'isUnion:', oName.isUnion());
console.log('nName:', checker.typeToString(nName), 'isUnion:', nName.isUnion());
for (const p of nName.isUnion() ? nName.types : [nName]) {
  console.log('  nPart:', checker.typeToString(p), 'flags:', p.flags, 'isObject:', Boolean(p.flags & ts.TypeFlags.Object));
}
