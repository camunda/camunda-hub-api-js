import { describe, expect, it, vi } from 'vitest';
import { createHubClient } from '../src';

/**
 * Validates that the lazily imported per-operation zod schemas still validate
 * requests and responses through the real client methods.
 */
describe('lazy schema loading', () => {
  it('req:strict rejects invalid request body through a real API method', async () => {
    const client = createHubClient({
      config: { CAMUNDA_SDK_VALIDATION: 'req:strict', CAMUNDA_HUB_ADDRESS: 'http://local' },
      fetch: vi.fn(
        async () =>
          new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
      ) as any,
    });
    // Pass a completely wrong body — createProject requires name + workspaceKey
    await expect(client.createProject({ bogus: true } as any)).rejects.toThrow();
  });

  it('req:strict passes valid request body through a real API method', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ projectKey: '28b47b0a-364c-4dbe-9836-41ab371c15b2' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    );
    const client = createHubClient({
      config: { CAMUNDA_SDK_VALIDATION: 'req:strict', CAMUNDA_HUB_ADDRESS: 'http://local' },
      fetch: fetchMock as any,
    });
    // Provide a valid body for createProject
    const result = await client.createProject({
      name: 'Payment Flow',
      workspaceKey: '0108f0ef-5c76-4a75-a602-45a9f04554fd' as any,
    });
    expect(fetchMock).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('res:strict rejects an invalid response through a real API method', async () => {
    const client = createHubClient({
      config: { CAMUNDA_SDK_VALIDATION: 'res:strict', CAMUNDA_HUB_ADDRESS: 'http://local' },
      // Return a response that doesn't match the getInfo schema
      fetch: vi.fn(
        async () =>
          new Response(JSON.stringify({ totallyWrong: 'not-info' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      ) as any,
    });
    await expect(client.getInfo()).rejects.toThrow();
  });

  it('res:strict passes a valid response through a real API method', async () => {
    const client = createHubClient({
      config: { CAMUNDA_SDK_VALIDATION: 'res:strict', CAMUNDA_HUB_ADDRESS: 'http://local' },
      fetch: vi.fn(
        async () =>
          new Response(JSON.stringify({ version: 'v2', authorizedOrganization: 'org-mno-789' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
      ) as any,
    });
    const result = await client.getInfo();
    expect(result).toBeDefined();
    expect(result.authorizedOrganization).toBe('org-mno-789');
  });
});
