import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');
const metadata = JSON.parse(
  fs.readFileSync(path.join(root, 'external-spec/bundled/spec-metadata.json'), 'utf8')
) as {
  operations: Array<{ operationId: string; vendorExtensions?: Record<string, unknown> }>;
};

/** operationId -> the JSDoc block above its generated method or function. */
function docBlocks(file: string): Map<string, string> {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const blocks = new Map<string, string>();
  for (const m of src.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*?@operationId (\w+)[\s\S]*?)\*\//g)) {
    blocks.set(m[2], m[1]);
  }
  return blocks;
}

describe('x-availability JSDoc hint', () => {
  const selfManagedOnly = metadata.operations
    .filter((op) => op.vendorExtensions?.['x-availability'] === 'sm')
    .map((op) => op.operationId);

  it('the spec marks some operations as Self-Managed only', () => {
    expect(selfManagedOnly.length).toBeGreaterThan(0);
  });

  for (const file of ['src/gen/HubClient.ts', 'src/gen/operations.gen.ts']) {
    it(`${file}: marked operations, and only those, carry the hint`, () => {
      const blocks = docBlocks(file);
      const hinted = [...blocks]
        .filter(([, doc]) => doc.includes('Self-Managed only.'))
        .map(([id]) => id)
        .sort();
      expect(hinted).toEqual([...selfManagedOnly].sort());
    });
  }
});
