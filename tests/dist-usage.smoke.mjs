// Simple post-build smoke test executed via `npm run test:dist`
// Runs outside vitest to avoid source transform/build race.
//
// Loads both published builds — ESM (`dist/index.js`) and CJS (`dist/index.cjs`) —
// and checks the main exports and a branded-key roundtrip on each.

import { stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function assertSurface(mod, label) {
  if (typeof mod.default !== 'function' && typeof mod.createHubClient !== 'function')
    throw new Error(`${label}: createHubClient missing`);
  const { HubClient, createHubClient, ProjectKey } = mod;
  if (typeof HubClient !== 'function') throw new Error(`${label}: expected HubClient class export`);
  if (typeof createHubClient !== 'function')
    throw new Error(`${label}: expected createHubClient factory export`);
  if (typeof ProjectKey?.assumeExists !== 'function')
    throw new Error(`${label}: ProjectKey.assumeExists missing`);
  const k = ProjectKey.assumeExists('28b47b0a-364c-4dbe-9836-41ab371c15b2');
  if (String(k) !== '28b47b0a-364c-4dbe-9836-41ab371c15b2')
    throw new Error(`${label}: key branding roundtrip failed`);
  const client = createHubClient({ config: { CAMUNDA_HUB_ADDRESS: 'http://localhost:8088' } });
  if (typeof client.getInfo !== 'function') throw new Error(`${label}: client.getInfo missing`);
}

async function main() {
  const root = path.resolve(process.cwd());
  const esm = path.join(root, 'dist', 'index.js');
  const cjs = path.join(root, 'dist', 'index.cjs');
  for (const f of [esm, cjs]) {
    await stat(f).catch(() => {
      throw new Error(`${path.relative(root, f)} missing; did build succeed?`);
    });
  }
  assertSurface(await import(pathToFileURL(esm).href), 'esm');
  assertSurface(createRequire(import.meta.url)(cjs), 'cjs');
  console.log('[dist-smoke] OK (ESM and CJS entries load)');
}

main().catch((e) => {
  console.error('[dist-smoke] FAIL', e);
  process.exit(1);
});
