import { describe, expect, it, vi } from 'vitest';
import { createHubClient, MemberEmail, WorkspaceKey } from '../src';

// Regression guard for request validation coverage (camunda/orchestration-cluster-api-js#405).
//
// hey-api 0.86 emitted one `z<OpId>Data` envelope schema, and every generated
// HubClient method validated the whole envelope — path, query and body
// together. 0.96+ split that into `z<OpId>Body` / `z<OpId>Path` /
// `z<OpId>Query`, and the class generator initially validated the body only:
// path and query params stopped being validated for every operation, and
// operations with no body validated nothing at all.
//
// hooks/post/300-generate-class-methods.ts now validates each present envelope
// slot against its own schema. These tests assert the observable contract:
// under `req:strict` an invalid path or query param must be rejected *before*
// the request reaches the transport, and the parsed value must be written back
// so coercion and schema defaults still apply outside the body.

/** A fetch that would succeed — so any rejection is validation, not transport. */
function okFetch() {
  // The `input` parameter is declared (not just ignored) so `mock.calls[n]` is a typed
  // tuple — tests assert on the Request the client actually built.
  return vi.fn(
    async (_input: Request) =>
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  );
}

function strictClient(fetchMock: ReturnType<typeof okFetch>) {
  return createHubClient({
    config: { CAMUNDA_SDK_VALIDATION: 'req:strict', CAMUNDA_HUB_ADDRESS: 'http://local' },
    fetch: fetchMock as any,
  });
}

describe('request validation covers path and query params, not just the body', () => {
  describe('path params', () => {
    // removeMember: a no-body, path-only op. zMemberEmail is `format: email`.
    it('rejects a malformed path param before reaching the transport', async () => {
      const fetchMock = okFetch();
      const client = strictClient(fetchMock);
      await expect(
        client.removeMember({
          workspaceKey: WorkspaceKey.assumeExists('0108f0ef-5c76-4a75-a602-45a9f04554fd'),
          email: 'not an email' as any,
        })
      ).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('accepts a well-formed path param', async () => {
      const fetchMock = okFetch();
      const client = strictClient(fetchMock);
      await client.removeMember({
        workspaceKey: WorkspaceKey.assumeExists('0108f0ef-5c76-4a75-a602-45a9f04554fd'),
        email: MemberEmail.assumeExists('alice@example.com'),
      });
      expect(fetchMock).toHaveBeenCalled();
      expect(fetchMock.mock.calls[0][0].url).toContain('/members/alice%40example.com');
    });
  });

  describe('query params', () => {
    // getClusterUsageMetrics: start / end are required int64 epoch millis.
    it('rejects a malformed query param before reaching the transport', async () => {
      const fetchMock = okFetch();
      const client = strictClient(fetchMock);
      await expect(
        client.getClusterUsageMetrics({ id: 'c1', start: 'yesterday' as any, end: 'today' as any })
      ).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('accepts well-formed query params and writes the parsed values back', async () => {
      const fetchMock = okFetch();
      const client = strictClient(fetchMock);
      // String inputs are coerced to numbers by the schema; the coerced values in the
      // URL prove the strict-mode parse result was written back to the query.
      await client.getClusterUsageMetrics({
        id: 'c1',
        start: ' 1700000000000' as any,
        end: 1700000360000,
      });
      expect(fetchMock).toHaveBeenCalled();
      const sent = new URL(fetchMock.mock.calls[0][0].url);
      expect(sent.searchParams.get('start')).toBe('1700000000000');
      expect(sent.searchParams.get('end')).toBe('1700000360000');
    });
  });

  describe('validation stays opt-in', () => {
    it('req:none sends a malformed path param untouched', async () => {
      const fetchMock = okFetch();
      const client = createHubClient({
        config: { CAMUNDA_HUB_ADDRESS: 'http://local' },
        fetch: fetchMock as any,
      });
      await client.removeMember({
        workspaceKey: WorkspaceKey.assumeExists('w1'),
        email: 'not an email' as any,
      });
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
