import { describe, expectTypeOf, it } from 'vitest';
import { createHubClientLoose } from '../src';

// This is a compile-time only test validating that a plain string is accepted
// where a branded CamundaKey<...> would normally be required in the strict client.
// We don't execute network calls; we only assert type relationships.

describe('createHubClientLoose type widening', () => {
  // Use only required config values; baseUrl is set via environment or defaults inside underlying client.
  const client = createHubClientLoose({});

  // Test skipped deliberately. This is a type test only, no execution.
  it.skip('accepts plain string for a method that expects a key parameter', () => {
    const projectKey: string = '123';
    // If widening failed this would require a branded ProjectKey and fail type-check.
    // @ts-expect-no-error
    client.getProject({ projectKey });

    // Return type still a promise; ensure it is Promise-like.
    type PIResultPromise = ReturnType<typeof client.getProject>;
    expectTypeOf<PIResultPromise>().toMatchTypeOf<Promise<any>>();
  });
});
