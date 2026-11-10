import { describe, expect, it, vi } from 'vitest';
import { createHubClient } from '../src';

describe('http retry', () => {
  it('retries on 429 then succeeds', async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls++;
      if (calls < 2) {
        return new Response(JSON.stringify({ message: 'rate limit' }), { status: 429 });
      }
      return new Response(JSON.stringify({ version: '1.0.0' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const client = createHubClient({
      config: {
        CAMUNDA_HUB_ADDRESS: 'https://example.com',
        CAMUNDA_AUTH_STRATEGY: 'NONE',
        CAMUNDA_SDK_HTTP_RETRY_MAX_ATTEMPTS: 3,
        CAMUNDA_SDK_HTTP_RETRY_BASE_DELAY_MS: 1,
        CAMUNDA_SDK_HTTP_RETRY_MAX_DELAY_MS: 5,
      } as any,
      fetch: fetchMock as any,
    });
    await client.getInfo();
    expect(calls).toBe(2);
  });

  it('does not retry on 500', async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls++;
      return new Response('server error', { status: 500 });
    });
    const client = createHubClient({
      config: {
        CAMUNDA_HUB_ADDRESS: 'https://example.com',
        CAMUNDA_AUTH_STRATEGY: 'NONE',
        CAMUNDA_SDK_HTTP_RETRY_MAX_ATTEMPTS: 3,
        CAMUNDA_SDK_HTTP_RETRY_BASE_DELAY_MS: 1,
        CAMUNDA_SDK_HTTP_RETRY_MAX_DELAY_MS: 5,
      } as any,
      fetch: fetchMock as any,
    });
    await expect(client.getInfo()).rejects.toMatchObject({ status: 500 });
    expect(calls).toBe(1);
  });

  it('retries on 503 (service unavailable) then succeeds', async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls++;
      if (calls < 3) return new Response('{}', { status: 503 });
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const client = createHubClient({
      config: {
        CAMUNDA_HUB_ADDRESS: 'https://example.com',
        CAMUNDA_SDK_HTTP_RETRY_MAX_ATTEMPTS: 3,
        CAMUNDA_SDK_HTTP_RETRY_BASE_DELAY_MS: 1,
        CAMUNDA_SDK_HTTP_RETRY_MAX_DELAY_MS: 5,
      } as any,
      fetch: fetchMock as any,
    });
    await client.getInfo();
    expect(calls).toBe(3);
  });
});
