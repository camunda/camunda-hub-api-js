import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createHubClient } from '../src';

// We rely on the generated schema for ProjectCreateRequest.

describe('request-side validation', () => {
  it('throws in req:strict mode on invalid body', async () => {
    process.env.CAMUNDA_HUB_ADDRESS = 'http://local';
    const client = createHubClient({
      config: { CAMUNDA_SDK_VALIDATION: 'req:strict', CAMUNDA_HUB_ADDRESS: 'http://local' },
    });
    const schema = z.object({ expected: z.string() });
    await expect(
      (client as any)._validation.gateRequest('createProject', schema, {
        expected: 123,
      } as any)
    ).rejects.toBeTruthy();
  });
  it('warns and proceeds in req:warn mode', async () => {
    const client = createHubClient({
      config: { CAMUNDA_SDK_VALIDATION: 'req:warn', CAMUNDA_HUB_ADDRESS: 'http://local' },
    });
    const schema = z.object({ expected: z.string() });
    const res = await (client as any)._validation.gateRequest('createProject', schema, {
      expected: 123,
    } as any);
    expect(res).toEqual({ expected: 123 });
  });
  it('skips in req:none mode', async () => {
    const client = createHubClient({
      config: { CAMUNDA_SDK_VALIDATION: 'req:none', CAMUNDA_HUB_ADDRESS: 'http://local' },
    });
    const schema = z.object({ expected: z.string() });
    const res = await (client as any)._validation.gateRequest('createProject', schema, {
      expected: 123,
    } as any);
    expect(res).toEqual({ expected: 123 });
  });
});
