import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe5', { recursive: true });
fs.writeFileSync('.scratch/probe5/o.d.ts', `export interface ProjectCreateRequest { name: string; target?: { kind: 'a'; tag?: string } | { kind: 'b'; tag?: string }; }
`);
fs.writeFileSync('.scratch/probe5/n.d.ts', `export interface ProjectCreateRequest { name: string; target?: { kind: 'a' | 'c'; tag?: string } | { kind: 'b'; tag?: string }; }
`);
const program = ts.createProgram(
  ['.scratch/probe5/o.d.ts', '.scratch/probe5/n.d.ts'],
  { strict: true, noEmit: true, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022, types: [] }
);
const checker = program.getTypeChecker();
const getType = (f: string, name: string) => {
  const sf = program.getSourceFile(f)!;
  return checker.getDeclaredTypeOfSymbol(checker.getExportsOfModule(checker.getSymbolAtLocation(sf)!).find(s => s.name === name)!);
};
const oReq = getType('.scratch/probe5/o.d.ts', 'ProjectCreateRequest');
const nReq = getType('.scratch/probe5/n.d.ts', 'ProjectCreateRequest');
const oTarget = checker.getTypeOfSymbol(oReq.getProperty('target')!);
const nTarget = checker.getTypeOfSymbol(nReq.getProperty('target')!);
console.log('oTarget:', checker.typeToString(oTarget), 'isUnion:', oTarget.isUnion());
console.log('nTarget:', checker.typeToString(nTarget), 'isUnion:', nTarget.isUnion());
// branch from the union (as inputPaths sees it)
const oBranch = oTarget.types.find(t => t.flags & ts.TypeFlags.Object && t.getProperty('kind'))!;
console.log('oBranch:', checker.typeToString(oBranch));
for (const q of nTarget.types) {
  console.log('  nPart:', checker.typeToString(q),
    'oBranch->q:', checker.isTypeAssignableTo(oBranch, q),
    'q->oBranch:', checker.isTypeAssignableTo(q, oBranch));
}
// now via the property symbol's declared type instead
const oBranchDecl = checker.getDeclaredTypeOfSymbol(oReq.getProperty('target')!);
console.log('declared === typeof:', oBranchDecl === oTarget);
