import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createHubClient, HubClient, ProjectKey, WorkspaceKey } from '../src';
import * as Fn from '../src/fn';
import * as Sdk from '../src/gen/sdk.gen';

/**
 * Per-operation functional entry point (`@camunda8/hub-api/fn`,
 * issue #537 phase 2b).
 *
 * Invariants, class-scoped over every operation (not a hand-picked list):
 *  - every SDK operation is exported from `./fn` as a standalone function;
 *  - the HubClient method of the same name is a one-line delegation to it, so
 *    the class and the function share one implementation;
 *  - every function that validates loads only its own per-operation schema module.
 */

const OPERATION_IDS = Object.keys(Sdk)
  .filter((k) => typeof (Sdk as Record<string, unknown>)[k] === 'function')
  .sort();

const root = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

type Captured = { method: string; url: string; body: unknown };

function recordingFetch(respond: (url: string) => unknown = () => ({})) {
  const calls: Captured[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const text = await req.text();
    calls.push({ method: req.method, url: req.url, body: text ? JSON.parse(text) : undefined });
    return new Response(JSON.stringify(respond(req.url)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { calls, fetch: fetch as typeof globalThis.fetch };
}

const baseConfig = { CAMUNDA_HUB_ADDRESS: 'http://localhost:8080' };

describe('./fn entry point — class-scoped invariants', () => {
  it('exports a standalone function for every SDK operation', () => {
    expect(OPERATION_IDS.length).toBeGreaterThan(60);
    const missing = OPERATION_IDS.filter(
      (op) => typeof (Fn as Record<string, unknown>)[op] !== 'function'
    );
    expect(missing).toEqual([]);
  });

  it('every HubClient operation method delegates to the function of the same name', () => {
    const src = read('src/gen/HubClient.ts');
    const notDelegating = OPERATION_IDS.filter((op) => {
      const proto = (HubClient.prototype as unknown as Record<string, unknown>)[op];
      if (typeof proto !== 'function') return true;
      // The implementation signature is followed by exactly one delegation line.
      const re = new RegExp(
        `\\n  ${op}\\([^\\n]*\\): CancelablePromise<any> \\{\\n    return Ops\\.${op}\\(this(, [^\\n]*)?\\);\\n  \\}\\n`
      );
      return !re.test(src);
    });
    expect(notDelegating).toEqual([]);
  });

  it('every validating function loads only its own per-operation schema module', () => {
    const ops = read('src/gen/operations.gen.ts');
    expect(ops).not.toMatch(/_loadSchemas\(/);
    const imports = [...ops.matchAll(/import\('\.\/zod\/(\w+)\.gen'\)/g)].map((m) => m[1]);
    expect(imports.length).toBeGreaterThan(100);
    // Every schema import sits inside the function of the same operation (overload
    // signatures and the implementation together form one function's region).
    const regions = [...ops.matchAll(/^export function (\w+)\(core: HubCore/gm)];
    const misplaced: string[] = [];
    regions.forEach((m, i) => {
      const end = i + 1 < regions.length ? regions[i + 1].index : ops.length;
      const region = ops.slice(m.index, end);
      for (const [, target] of region.matchAll(/import\('\.\/zod\/(\w+)\.gen'\)/g)) {
        if (target !== m[1]) misplaced.push(`${m[1]} -> ${target}`);
      }
    });
    expect(misplaced).toEqual([]);
  });
});

describe('./fn entry point — behaviour', () => {
  it('a function on a bare core sends the same request as the client method', async () => {
    const viaFn = recordingFetch(() => ({ projectKey: '1' }));
    const viaClient = recordingFetch(() => ({ projectKey: '1' }));
    const core = Fn.createHubCore({ config: baseConfig, fetch: viaFn.fetch });
    const client = createHubClient({ config: baseConfig, fetch: viaClient.fetch });
    const input = {
      name: 'Payment Flow',
      workspaceKey: WorkspaceKey.assumeExists('0108f0ef-5c76-4a75-a602-45a9f04554fd'),
    };
    await Fn.createProject(core, input);
    await client.createProject(input);
    expect(viaFn.calls).toHaveLength(1);
    expect(viaFn.calls).toEqual(viaClient.calls);
  });

  it('no-input operations take options directly', async () => {
    // Return a retryable 429 first: if `retry: false` were ignored the client would
    // re-attempt and succeed on the second call, so a single-attempt assertion would
    // fail. With retry honoured there is exactly one attempt and the 429 surfaces.
    let n = 0;
    const fetch = (async () => {
      n++;
      if (n === 1) {
        return new Response(JSON.stringify({ title: 'rate limited' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ brokers: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof globalThis.fetch;
    const core = Fn.createHubCore({ config: baseConfig, fetch });
    await expect(Fn.getInfo(core, { retry: false })).rejects.toMatchObject({ status: 429 });
    expect(n).toBe(1);
  });

  it('path-param operations address the resource under /api/v2', async () => {
    const rec = recordingFetch(() => ({ projectKey: '1' }));
    const core = Fn.createHubCore({ config: baseConfig, fetch: rec.fetch });
    await Fn.getProject(core, { projectKey: ProjectKey.assumeExists('2251799813685249') });
    expect(new URL(rec.calls[0].url).pathname).toBe('/api/v2/projects/2251799813685249');
  });

  it('accepts a HubClient as the core', async () => {
    const rec = recordingFetch(() => ({ brokers: [] }));
    const client = createHubClient({ config: baseConfig, fetch: rec.fetch });
    await Fn.getInfo(client);
    expect(rec.calls).toHaveLength(1);
  });

  it('support logger names the constructed component (core vs client)', () => {
    // A bare core must not be attributed to a (nonexistent) client in support diagnostics.
    const coreMsgs: string[] = [];
    Fn.createHubCore({
      config: baseConfig,
      supportLogger: { log: (m: string) => void coreMsgs.push(m) } as any,
    });
    expect(coreMsgs.some((m) => m.includes('HubCore constructed'))).toBe(true);
    expect(coreMsgs.some((m) => m.includes('HubClient constructed'))).toBe(false);

    const clientMsgs: string[] = [];
    createHubClient({
      config: baseConfig,
      supportLogger: { log: (m: string) => void clientMsgs.push(m) } as any,
    });
    expect(clientMsgs.some((m) => m.includes('HubClient constructed'))).toBe(true);

    // A consumer subclass of the now-public HubCore is still a core: it has no
    // client operation surface, so support diagnostics must not mislabel it as a client.
    class CustomCore extends Fn.HubCore {}
    const subclassMsgs: string[] = [];
    new CustomCore({
      config: baseConfig,
      supportLogger: { log: (m: string) => void subclassMsgs.push(m) } as any,
    });
    expect(subclassMsgs.some((m) => m.includes('HubCore constructed'))).toBe(true);
    expect(subclassMsgs.some((m) => m.includes('HubClient constructed'))).toBe(false);
  });

  it('validates requests with the per-operation schemas when enabled', async () => {
    const rec = recordingFetch();
    const core = Fn.createHubCore({
      config: { ...baseConfig, CAMUNDA_SDK_VALIDATION: 'req:strict' },
      fetch: rec.fetch,
    });
    await expect(Fn.createProject(core, { bogus: true } as never)).rejects.toThrow();
    expect(rec.calls).toHaveLength(0);
  });
});
