import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbg-t-'));
fs.writeFileSync(path.join(dir, 'index.d.ts'),
`declare class HubCore { private readonly secret; configure(): void; }
declare class HubClientBase extends HubCore {
  searchProjects(input: { name?: string }): Promise<string[]> & { paginate(input: { name?: string }): Promise<string[]> };
}
export type HubClient = HubClientBase;
export { HubCore, HubClientBase };
`);
const program = ts.createProgram([path.join(dir, 'index.d.ts')], { strict: true, skipLibCheck: true, noEmit: true });
const checker = program.getTypeChecker();
const sf = program.getSourceFile(path.join(dir, 'index.d.ts'));
let clientSym;
ts.forEachChild(sf, (node) => {
  if (ts.isTypeAliasDeclaration(node) && node.name.text === 'HubClient')
    clientSym = checker.getSymbolAtLocation(node.name);
});
const clientType = checker.getDeclaredTypeOfSymbol(clientSym);
for (const p of checker.getPropertiesOfType(clientType)) {
  const t1 = checker.getTypeOfSymbol(p);
  const decl = p.valueDeclaration ?? p.declarations?.[0];
  const t2 = decl ? checker.getTypeOfSymbolAtLocation(p, decl) : undefined;
  const t3 = checker.getDeclaredTypeOfSymbol(p);
  console.log(p.getName());
  console.log('  getTypeOfSymbol:          ', checker.typeToString(t1));
  console.log('  getTypeOfSymbolAtLocation:', t2 ? checker.typeToString(t2) : '-');
  console.log('  getDeclaredTypeOfSymbol:  ', checker.typeToString(t3));
}
