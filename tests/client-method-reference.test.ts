import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// TypeDoc documents only exported declarations. When the class carrying the client's
// operation methods stopped being exported, the whole method reference vanished from
// the published docs without any build failure.

const repoRoot = join(__dirname, '..');
const clientPath = join(repoRoot, 'src/gen/HubClient.ts');
const clientSource = readFileSync(clientPath, 'utf8');
const operationIds = [
  ...new Set([...clientSource.matchAll(/@operationId\s+(\w+)/g)].map((m) => m[1])),
];

describe('client method reference', () => {
  it('declares every operation on a class that the package entry exports', () => {
    const sf = ts.createSourceFile(clientPath, clientSource, ts.ScriptTarget.Latest, true);
    const exportedClasses = sf.statements.filter(
      (s): s is ts.ClassDeclaration =>
        ts.isClassDeclaration(s) &&
        !!s.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    );
    const exportedMethods = new Set(
      exportedClasses.flatMap((c) =>
        c.members.filter(ts.isMethodDeclaration).map((m) => m.name.getText(sf).toLowerCase())
      )
    );

    expect(operationIds.length).toBeGreaterThan(0);
    const undocumented = operationIds.filter((op) => !exportedMethods.has(op.toLowerCase()));
    expect(undocumented).toEqual([]);
    expect(readFileSync(join(repoRoot, 'src/index.ts'), 'utf8')).toContain(
      "export * from './gen/HubClient'"
    );
  });
});
