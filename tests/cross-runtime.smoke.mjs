// Cross-runtime smoke test for the built package.
//
// Verifies that the published artifact loads, constructs a client, and issues
// requests on Node, Deno, and Bun. The client is a `@hey-api/client-fetch` (Web
// `fetch`) client and every `node:` import in the runtime is dynamic +
// peripheral (OAuth file cache, support logger, mTLS), so the module graph is
// spec-strict-runtime safe. This test guards that property against regressions.
//
// It is meant to run FROM A CONSUMER project that has installed the package
// (see scripts/cross-runtime-smoke.mjs), so it imports the package by its bare
// specifier — exactly how a real consumer does.
//
// Behaviour is env-driven:
//   - Always: import + construct + key-branding checks, plus a GET and a POST
//     through an injected `fetch`. Issuing a request is what builds a `Request`
//     and therefore exercises the Request-init sanitize path on spec-strict
//     runtimes — no Hub server needed.
//   - When CAMUNDA_HUB_ADDRESS is set: also a live `getInfo()` GET against that
//     Hub. Auth is taken from the standard CAMUNDA_* environment.

import { createHubClient, ProjectKey, WorkspaceKey } from '@camunda8/hub-api';

/** Read an env var portably (Deno uses Deno.env; Node/Bun use process.env). */
const env = (key) => {
  const g = globalThis;
  if (g.Deno?.env?.get) return g.Deno.env.get(key);
  return g.process?.env?.[key];
};

const runtime = globalThis.Deno
  ? `Deno ${globalThis.Deno.version.deno}`
  : globalThis.Bun
    ? `Bun ${globalThis.Bun.version}`
    : `Node ${globalThis.process?.versions?.node ?? '?'}`;

const fail = (msg) => {
  console.error(`[cross-runtime] FAIL on ${runtime}: ${msg}`);
  const exit = globalThis.Deno?.exit ?? globalThis.process?.exit;
  exit?.(1);
  throw new Error(msg);
};

console.log(`[cross-runtime] runtime=${runtime} fetch=${typeof fetch}`);

// 1. Import + shape.
if (typeof createHubClient !== 'function') fail('createHubClient is not a function');

// 2. Branded-key helper roundtrips (exercises a representative runtime util).
if (String(ProjectKey.assumeExists('42')) !== '42') fail('key branding roundtrip failed');

// 3. Requests through an injected fetch. The SDK builds a real `Request` and
//    hands it to this fetch, so an unsanitized RequestInit would throw here on
//    spec-strict runtimes (Deno, Bun).
const seen = [];
const stubFetch = async (input) => {
  const req = input instanceof Request ? input : new Request(input);
  seen.push(`${req.method} ${new URL(req.url).pathname}`);
  const body =
    req.method === 'GET'
      ? { version: 'v2', authorizedOrganization: 'org-smoke' }
      : { projectKey: '28b47b0a-364c-4dbe-9836-41ab371c15b2' };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
const stubbed = createHubClient({
  config: { CAMUNDA_HUB_ADDRESS: 'http://hub.invalid', CAMUNDA_AUTH_STRATEGY: 'NONE' },
  fetch: stubFetch,
});
const info = await stubbed.getInfo();
if (info?.authorizedOrganization !== 'org-smoke') fail(`getInfo returned ${JSON.stringify(info)}`);
await stubbed.createProject({
  name: 'smoke',
  workspaceKey: WorkspaceKey.assumeExists('0108f0ef-5c76-4a75-a602-45a9f04554fd'),
});
const expected = ['GET /api/v2/info', 'POST /api/v2/projects'];
if (JSON.stringify(seen) !== JSON.stringify(expected))
  fail(`unexpected requests: ${JSON.stringify(seen)}`);
console.log('[cross-runtime] import + construct + branding + stubbed requests OK');

// 4. Live REST I/O (only when a Hub address is configured).
if (env('CAMUNDA_HUB_ADDRESS')) {
  const live = await createHubClient().getInfo();
  if (!live?.version) fail(`getInfo returned no version: ${JSON.stringify(live).slice(0, 200)}`);
  console.log(`[cross-runtime] live getInfo OK (version=${live.version})`);
} else {
  console.log('[cross-runtime] CAMUNDA_HUB_ADDRESS unset — no live I/O');
}

console.log(`[cross-runtime] PASS on ${runtime}`);
