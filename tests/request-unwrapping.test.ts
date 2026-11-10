import { describe, expect, it } from 'vitest';
import { createHubClient, ProjectKey, WorkspaceKey } from '../src';

function makeClient(capture: { url?: string; request?: Request; bodyText?: string }) {
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let req: Request;
    if (input instanceof Request) {
      req = input;
    } else {
      req = new Request(input, init);
    }
    capture.url = req.url;
    capture.request = req;
    try {
      capture.bodyText = await req.clone().text();
    } catch {
      /* ignore */
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return createHubClient({
    config: { CAMUNDA_SDK_VALIDATION: 'none', CAMUNDA_HUB_ADDRESS: 'http://localhost:8088' },
    fetch,
  });
}

describe('semantic key request unwrapping', () => {
  it('unwrapped in path params (getProject)', async () => {
    const capture: any = {};
    const client = makeClient(capture);
    const key = ProjectKey.assumeExists('12345');
    await client.getProject({ projectKey: key });
    expect(capture.url).toBe('http://localhost:8088/api/v2/projects/12345');
  });

  it('unwrapped in request body (createProject)', async () => {
    const capture: any = {};
    const client = makeClient(capture);
    const key = WorkspaceKey.assumeExists('67890');
    await client.createProject({ name: 'Payment Flow', workspaceKey: key });
    expect(JSON.parse(capture.bodyText)).toEqual({ name: 'Payment Flow', workspaceKey: '67890' });
  });

  it('unwrapped in a search filter (searchProjects)', async () => {
    const capture: any = {};
    const client = makeClient(capture);
    const key = WorkspaceKey.assumeExists('24680');
    await client.searchProjects({ filter: { workspaceKey: key } } as any);
    expect(capture.bodyText).toContain('"workspaceKey":"24680"');
  });
});
