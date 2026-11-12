import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

fs.rmSync('.scratch/probe22', { recursive: true, force: true });
fs.mkdirSync('.scratch/probe22/o', { recursive: true });
fs.mkdirSync('.scratch/probe22/n', { recursive: true });
fs.writeFileSync('.scratch/probe22/o/index.d.ts', `export interface R { name: string; }
`);
fs.writeFileSync('.scratch/probe22/n/index.d.ts', `export interface R { name?: string; }
`);
const loadSide = (dir: string) => {
  const program = ts.createProgram([path.join(dir, 'index.d.ts')], {
    strict: true, skipLibCheck: true, noEmit: true,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, target: ts.ScriptTarget.ES2022,
  });
  return { checker: program.getTypeChecker(), program };
};
const o = loadSide('.scratch/probe22/o');
const n = loadSide('.scratch/probe22/n');
const getR = (side: { checker: ts.TypeChecker; program: ts.Program }, dir: string) => {
  const sf = side.program.getSourceFile(path.join(dir, 'index.d.ts'))!;
  return side.checker.getDeclaredTypeOfSymbol(side.checker.getExportsOfModule(side.checker.getSymbolAtLocation(sf)!).find(s => s.name === 'R')!);
};
const oR = getR(o, '.scratch/probe22/o');
const nR = getR(n, '.scratch/probe22/n');
const oName = o.checker.getTypeOfSymbol(oR.getProperty('name')!);
const nName = n.checker.getTypeOfSymbol(nR.getProperty('name')!);
console.log('oName:', o.checker.typeToString(oName), 'isUnion:', oName.isUnion(), 'flags:', oName.flags);
console.log('nName:', n.checker.typeToString(nName), 'isUnion:', nName.isUnion(), 'flags:', nName.flags);
if (nName.isUnion()) {
  for (const q of nName.types) {
    console.log('  part:', n.checker.typeToString(q), 'flags:', q.flags, 'Object?', Boolean(q.flags & ts.TypeFlags.Object));
  }
  const strPart = nName.types.find(t => t.flags & ts.TypeFlags.String)!;
  console.log('oName -> strPart:', n.checker.isTypeAssignableTo(oName, strPart));
}
