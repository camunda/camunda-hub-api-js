import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe19', { recursive: true });
fs.writeFileSync('.scratch/probe19/o.d.ts', `export interface ProjectResult { projectKey: string; name: string; }
`);
fs.writeFileSync('.scratch/probe19/n.d.ts', `export interface ProjectResult { projectKey: string; name?: string; }
`);
const program = ts.createProgram(['.scratch/probe19/o.d.ts', '.scratch/probe19/n.d.ts'], {
  strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [],
});
const checker = program.getTypeChecker();
const getType = (f: string) => {
  const sf = program.getSourceFile(f)!;
  return checker.getDeclaredTypeOfSymbol(checker.getExportsOfModule(checker.getSymbolAtLocation(sf)!).find(s => s.name === 'ProjectResult')!);
};
const oT = getType('.scratch/probe19/o.d.ts');
const nT = getType('.scratch/probe19/n.d.ts');
const oName = checker.getTypeOfSymbol(oT.getProperty('name')!);
const nName = checker.getTypeOfSymbol(nT.getProperty('name')!);
const strPart = nName.types.find(t => t.flags & ts.TypeFlags.String)!;
const undefPart = nName.types.find(t => t.flags & ts.TypeFlags.Undefined)!;
console.log('oName -> strPart:', checker.isTypeAssignableTo(oName, strPart));
console.log('oName -> undefPart:', checker.isTypeAssignableTo(oName, undefPart));
console.log('oName -> nName:', checker.isTypeAssignableTo(oName, nName));
