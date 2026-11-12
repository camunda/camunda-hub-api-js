import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe29', { recursive: true });
fs.writeFileSync('.scratch/probe29/check.ts', `
type _A<F> = F extends (...a: any) => infer X ? Awaited<X> : never;
interface ProjectResult { projectKey: string; name?: string; }
declare function f(input: string): Promise<ProjectResult>;
type R = _A<typeof f>;
declare const r: R;
const n = r.name;
`);
const program = ts.createProgram(['.scratch/probe29/check.ts'], {
  strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, types: [],
});
const checker = program.getTypeChecker();
const sf = program.getSourceFile('.scratch/probe29/check.ts')!;
let found = false;
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText() === 'r') {
    const t = checker.getTypeAtLocation(node.name);
    console.log('R =', checker.typeToString(t));
    const name = t.getProperty('name');
    if (name) {
      const nt = checker.getTypeOfSymbol(name);
      console.log('name type:', checker.typeToString(nt), 'isUnion:', nt.isUnion());
    }
    found = true;
  }
  ts.forEachChild(node, visit);
};
visit(sf);
console.log('found:', found);
