import ts from 'typescript';
import fs from 'node:fs';

// Two "sides" loaded as SEPARATE programs, like loadSide does, then cross-compared.
fs.mkdirSync('.scratch/probe20/o', { recursive: true });
fs.mkdirSync('.scratch/probe20/n', { recursive: true });
fs.writeFileSync('.scratch/probe20/o/index.d.ts', `export interface ProjectResult { projectKey: string; name: string; }
`);
fs.writeFileSync('.scratch/probe20/n/index.d.ts', `export interface ProjectResult { projectKey: string; name?: string; }
`);
const mk = (f: string) => ts.createProgram([f], {
  strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [],
});
const oProg = mk('.scratch/probe20/o/index.d.ts');
const nProg = mk('.scratch/probe20/n/index.d.ts');
const oChecker = oProg.getTypeChecker();
const nChecker = nProg.getTypeChecker();
const getType = (prog: ts.Program, checker: ts.TypeChecker, f: string) => {
  const sf = prog.getSourceFile(f)!;
  return checker.getDeclaredTypeOfSymbol(checker.getExportsOfModule(checker.getSymbolAtLocation(sf)!).find(s => s.name === 'ProjectResult')!);
};
const oT = getType(oProg, oChecker, '.scratch/probe20/o/index.d.ts');
const nT = getType(nProg, nChecker, '.scratch/probe20/n/index.d.ts');
const oName = oChecker.getTypeOfSymbol(oT.getProperty('name')!);
const nName = nChecker.getTypeOfSymbol(nT.getProperty('name')!);
console.log('oName:', oChecker.typeToString(oName), 'isUnion:', oName.isUnion());
console.log('nName:', nChecker.typeToString(nName), 'isUnion:', nName.isUnion());
const strPart = nName.types.find(t => t.flags & ts.TypeFlags.String)!;
// cross-program assignability: nChecker comparing oName (from oProg)
console.log('cross: oName -> strPart via nChecker:', nChecker.isTypeAssignableTo(oName, strPart));
console.log('cross: oName -> strPart via oChecker:', oChecker.isTypeAssignableTo(oName, strPart));
