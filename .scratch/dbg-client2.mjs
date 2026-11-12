import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbg-c2-'));
fs.writeFileSync(path.join(dir, 'index.d.ts'),
`declare class HubCore { private readonly secret; configure(): void; }
export interface ProjectResult { projectKey: string; name: string; }
declare class HubClientBase extends HubCore {
  searchProjects(input: { name?: string }): Promise<ProjectResult[]> & { paginate(input: { name?: string }): Promise<ProjectResult[]> };
}
export type HubClient = HubClientBase;
export declare function createHubClient(): HubClient;
export { HubCore, HubClientBase };
`);
const program = ts.createProgram([path.join(dir, 'index.d.ts')], { strict: true, skipLibCheck: true, noEmit: true });
const checker = program.getTypeChecker();
const sf = program.getSourceFile(path.join(dir, 'index.d.ts'));
const moduleSym = checker.getSymbolAtLocation(sf);
const client = checker.getExportsOfModule(moduleSym).find((e) => e.getName() === 'HubClient');
const clientType = checker.getDeclaredTypeOfSymbol(client);
console.log('clientType:', checker.typeToString(clientType), 'isClass?', Boolean(clientType.flags & ts.TypeFlags.Object));
const p = checker.getPropertiesOfType(clientType).find((x) => x.getName() === 'searchProjects');
console.log('prop flags:', p.flags, 'Method?', Boolean(p.flags & ts.SymbolFlags.Method));
const t = checker.getTypeOfSymbol(p);
console.log('type:', checker.typeToString(t));
console.log('intersection?', Boolean(t.flags & ts.TypeFlags.Intersection));
console.log('paginate:', Boolean(t.getProperty('paginate')));

console.log('--- alternatives ---');
const t2 = checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration);
console.log('atLocation:', checker.typeToString(t2), 'paginate:', Boolean(t2.getProperty('paginate')));
// apparent type
const at = checker.getApparentType(t);
console.log('apparent paginate:', Boolean(at.getProperty('paginate')));
// resolved members
console.log('resolved members:', t.getProperties().map((x) => x.getName()));

console.log('--- signatures ---');
const sig = t.getCallSignatures()[0];
const ret = sig.getReturnType();
console.log('return:', checker.typeToString(ret));
console.log('return intersection?', Boolean(ret.flags & ts.TypeFlags.Intersection));
console.log('return paginate:', Boolean(ret.getProperty('paginate')));
if (ret.flags & ts.TypeFlags.Intersection) {
  for (const part of ret.types) console.log('  part:', checker.typeToString(part), 'paginate?', Boolean(part.getProperty('paginate')));
}
