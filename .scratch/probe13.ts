import ts from 'typescript';
import fs from 'node:fs';

fs.mkdirSync('.scratch/probe13', { recursive: true });
fs.writeFileSync('.scratch/probe13/check.ts', `
interface ProjectResult { projectKey: string; name: string; }
interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type EqW = _Eq<CancelablePromise<ProjectResult>, Promise<ProjectResult>>;
type C = EqW extends true ? unknown : Promise<ProjectResult> extends CancelablePromise<ProjectResult> ? never : unknown;
// resolve C via the checker
declare const probe: C;
`);
const program = ts.createProgram(['.scratch/probe13/check.ts'], {
  strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, types: [],
});
const checker = program.getTypeChecker();
const sf = program.getSourceFile('.scratch/probe13/check.ts')!;
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText() === 'probe') {
    const t = checker.getTypeAtLocation(node.name);
    console.log('C resolves to:', checker.typeToString(t));
    if (t.flags & ts.TypeFlags.Conditional) {
      const c = t as ts.ConditionalType;
      console.log('  conditional, resolved?', checker.typeToString(c.root.node ? t : t));
    }
  }
  ts.forEachChild(node, visit);
};
visit(sf);
