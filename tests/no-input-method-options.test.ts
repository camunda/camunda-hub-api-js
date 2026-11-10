// Every HubClient method for an operation without input is declared as
// `name(options?: OperationOptions)`. The options passed in that position must be
// honoured, not read as an (absent) input and dropped.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createHubClient } from '../src';

const clientSource = readFileSync(join(__dirname, '../src/gen/HubClient.ts'), 'utf8');
const noInputMethods = [
  ...clientSource.matchAll(/^ {2}(\w+)\(options\?: OperationOptions\): CancelablePromise/gm),
].map((m) => m[1]);

function clientCountingCalls() {
  const counter = { calls: 0 };
  const client = createHubClient({
    config: {
      CAMUNDA_HUB_ADDRESS: 'https://example.com',
      CAMUNDA_AUTH_STRATEGY: 'NONE',
      CAMUNDA_SDK_HTTP_RETRY_MAX_ATTEMPTS: 3,
      CAMUNDA_SDK_HTTP_RETRY_BASE_DELAY_MS: 1,
      CAMUNDA_SDK_HTTP_RETRY_MAX_DELAY_MS: 2,
    } as any,
    fetch: (async () => {
      counter.calls++;
      return new Response('unavailable', { status: 503 });
    }) as any,
  });
  return { client, counter };
}

describe('no-input HubClient methods honour their options argument', () => {
  it('finds the no-input methods in the generated client', () => {
    expect(noInputMethods).toEqual(
      expect.arrayContaining(['getInfo', 'getEnvironments', 'getClusterRegistrations'])
    );
  });

  it.each(noInputMethods)('%s({ retry: false }) makes a single attempt', async (method) => {
    const { client, counter } = clientCountingCalls();
    await expect((client as any)[method]({ retry: false })).rejects.toBeTruthy();
    expect(counter.calls).toBe(1);
  });

  it.each(noInputMethods)('%s() retries by default', async (method) => {
    const { client, counter } = clientCountingCalls();
    await expect((client as any)[method]()).rejects.toBeTruthy();
    expect(counter.calls).toBe(3);
  });
});
