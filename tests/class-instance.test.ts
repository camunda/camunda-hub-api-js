import { describe, expect, it, vi } from 'vitest';
import { createHubClient } from '../src';

describe('Camunda class instances', () => {
  it('isolates baseUrl and fetch per instance', async () => {
    const f1 = vi.fn(
      async (req: Request) =>
        new Response(JSON.stringify({ id: 'c1', url: req.url }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    );
    const f2 = vi.fn(
      async (req: Request) =>
        new Response(JSON.stringify({ id: 'c2', url: req.url }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    );

    const c1 = createHubClient({
      config: { CAMUNDA_HUB_ADDRESS: 'http://cluster-one:8080' },
      fetch: f1 as any,
    });
    const c2 = createHubClient({
      config: { CAMUNDA_HUB_ADDRESS: 'http://cluster-two:8080' },
      fetch: f2 as any,
    });

    const r1 = await (c1 as any).getInfo();
    const r2 = await (c2 as any).getInfo();

    expect(f1).toHaveBeenCalledTimes(1);
    expect(f2).toHaveBeenCalledTimes(1);
    expect(r1).toMatchObject({ id: 'c1', url: 'http://cluster-one:8080/api/v2/info' });
    expect(r2).toMatchObject({ id: 'c2', url: 'http://cluster-two:8080/api/v2/info' });
  });
});
