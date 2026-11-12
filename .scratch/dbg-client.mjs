import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbg-c-'));
fs.mkdirSync(path.join(dir, 'fn'), { recursive: true });
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
fs.writeFileSync(path.join(dir, 'logger.d.ts'), 'export declare function createLogger(): void;\n');
fs.writeFileSync(path.join(dir, 'fn', 'index.d.ts'), 'export {};\n');

// Mirror loadSide
const files = ['index', 'logger', 'fn/index'].map((e) => path.join(dir, `${e}.d.ts`));
const program = ts.createProgram(files, {
  strict: true, skipLibCheck: true, noEmit: true,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
});
const checker = program.getTypeChecker();
const sf = program.getSourceFile(path.join(dir, 'index.d.ts'));
const moduleSym = checker.getSymbolAtLocation(sf);
const exportsOfIndex = new Map();
for (const e of checker.getExportsOfModule(moduleSym)) exportsOfIndex.set(e.getName(), e);
console.log('exports:', [...exportsOfIndex.keys()]);

const resolveAlias = (s) => (s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s);
const client = exportsOfIndex.get('HubClient');
console.log('client flags:', client.flags, 'alias?', Boolean(client.flags & ts.SymbolFlags.Alias));
const clientType = checker.getDeclaredTypeOfSymbol(resolveAlias(client));
for (const p of checker.getPropertiesOfType(clientType)) {
  const t = checker.getTypeOfSymbol(p);
  console.log(p.getName(), '| callSigs:', t.getCallSignatures().length, '| paginate:', Boolean(t.getProperty('paginate')));
}
