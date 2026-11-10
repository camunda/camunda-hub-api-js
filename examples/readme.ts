// Compilable usage examples that appear in README.md.
// These snippets are synced into README.md by scripts/sync-readme-snippets.ts.
// They are type-checked during build (via tsc --noEmit) to guard against API drift.

import createHubClient, {
  createHubResultClient,
  isOk,
  isSdkError,
  type ProjectKey,
  WorkspaceKey,
} from '@camunda8/hub-api';
//#region ReadmePerOperationFunctionsImport
import { createHubCore, createProject, getInfo } from '@camunda8/hub-api/fn';

//#endregion ReadmePerOperationFunctionsImport

// ---------------------------------------------------------------------------
// Quick Start
// ---------------------------------------------------------------------------

async function _readmeQuickStart() {
  //#region ReadmeQuickStart
  // Zero-config construction: reads CAMUNDA_* from process.env.
  // With no configuration it targets a local Hub at http://localhost:8088/api/v2.
  const hub = createHubClient();

  const info = await hub.getInfo();
  console.log(`Hub API ${info.version}, organization ${info.authorizedOrganization}`);
  //#endregion ReadmeQuickStart
}

// ---------------------------------------------------------------------------
// Programmatic Overrides
// ---------------------------------------------------------------------------

async function _readmeOverrides() {
  //#region ReadmeOverrides
  const hub = createHubClient({
    config: {
      CAMUNDA_HUB_ADDRESS: 'https://hub.example.com',
      CAMUNDA_AUTH_STRATEGY: 'OAUTH',
      CAMUNDA_CLIENT_ID: 'my-client-id',
      CAMUNDA_CLIENT_SECRET: 'my-client-secret',
      CAMUNDA_OAUTH_URL: 'https://idp.example.com/realms/camunda/protocol/openid-connect/token',
      CAMUNDA_HUB_TOKEN_AUDIENCE: 'web-modeler-public-api',
    },
  });
  //#endregion ReadmeOverrides
  void hub;
}

// ---------------------------------------------------------------------------
// Custom Fetch
// ---------------------------------------------------------------------------

async function _readmeCustomFetch() {
  //#region ReadmeCustomFetch
  const hub = createHubClient({
    fetch: (input, init) => {
      // inspect / modify request here
      return fetch(input, init);
    },
  });
  //#endregion ReadmeCustomFetch
  void hub;
}

// ---------------------------------------------------------------------------
// End-to-end: workspace → project → file
// ---------------------------------------------------------------------------

async function _readmeWorkflow(bpmnXml: string) {
  //#region ReadmeWorkflow
  const hub = createHubClient();

  const workspace = await hub.createWorkspace({ name: 'Payments' });
  const project = await hub.createProject({
    name: 'Order Fulfilment',
    workspaceKey: workspace.workspaceKey,
  });
  const file = await hub.createFile({
    name: 'Order Process',
    projectKey: project.projectKey,
    type: 'bpmn',
    content: bpmnXml,
  });

  // Snapshot the project once the file is in place.
  const snapshot = await hub.createProjectSnapshot({
    projectKey: project.projectKey,
    name: 'Initial import',
  });
  console.log(file.fileKey, snapshot.projectSnapshotKey);
  //#endregion ReadmeWorkflow
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

async function _readmePagination(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();
  //#region ReadmePagination
  // One page: offset pagination with from/limit.
  const first = await hub.searchProjects({
    filter: { workspaceKey },
    page: { from: 0, limit: 50 },
  });
  console.log(`${first.items.length} of ${first.page.totalItems}`);

  // Every page: `.paginate()` follows the offset for you.
  for await (const project of hub.searchProjects.paginate({ filter: { workspaceKey } }).items()) {
    console.log(project.name);
  }

  // Or collect them, with a safety cap on the number of pages fetched.
  const all = await hub.searchProjects
    .paginate({ filter: { workspaceKey }, page: { limit: 100 } }, { maxPages: 10 })
    .toArray();
  console.log(all.length);
  //#endregion ReadmePagination
}

// ---------------------------------------------------------------------------
// Disable Retry
// ---------------------------------------------------------------------------

async function _readmeDisableRetry(projectKey: ProjectKey) {
  const hub = createHubClient();
  //#region ReadmeDisableRetry
  // This call will not retry on transient errors
  await hub.deleteProject({ projectKey }, { retry: false });
  //#endregion ReadmeDisableRetry
}

// ---------------------------------------------------------------------------
// Override Retry Settings
// ---------------------------------------------------------------------------

async function _readmeRetryOverride(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();
  //#region ReadmeRetryOverride
  // More aggressive retry for this operation only
  await hub.createProject(
    { name: 'Order Fulfilment', workspaceKey },
    { retry: { maxAttempts: 8, maxDelayMs: 5000 } }
  );

  // Minimal retry: single retry with short backoff
  await hub.getInfo({ retry: { maxAttempts: 2, baseDelayMs: 50 } });
  //#endregion ReadmeRetryOverride
}

// ---------------------------------------------------------------------------
// Branded Keys
// ---------------------------------------------------------------------------

function _readmeBrandedKeys() {
  //#region ReadmeBrandedKeys
  const workspaceKey = WorkspaceKey.assumeExists('0108f0ef-5c76-4a75-a602-45a9f04554fd');
  // @ts-expect-error – a WorkspaceKey is not a ProjectKey
  const bad: ProjectKey = workspaceKey;
  //#endregion ReadmeBrandedKeys
  void bad;
}

// ---------------------------------------------------------------------------
// Cancelable Operations
// ---------------------------------------------------------------------------

async function _readmeCancelable(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();
  //#region ReadmeCancelable
  const p = hub.searchProjects({ filter: { workspaceKey } });
  setTimeout(() => p.cancel(), 100); // best-effort cancel
  try {
    await p; // resolves if not cancelled
  } catch (e) {
    if (isSdkError(e) && e.name === 'CancelSdkError') {
      console.log('Operation cancelled');
    } else throw e;
  }
  //#endregion ReadmeCancelable
}

// ---------------------------------------------------------------------------
// Per-operation functions (tree-shakeable)
// ---------------------------------------------------------------------------

async function _readmePerOperationFunctions(workspaceKey: WorkspaceKey) {
  //#region ReadmePerOperationFunctions
  // Same options as createHubClient(); a HubClient also works as the core.
  const core = createHubCore();

  const info = await getInfo(core);
  console.log(info.version);

  const project = await createProject(core, { name: 'Order Fulfilment', workspaceKey });
  console.log(project.projectKey);
  //#endregion ReadmePerOperationFunctions
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

async function _readmeLogging() {
  //#region ReadmeLogging
  const hub = createHubClient({
    log: {
      level: 'info',
      transport: (evt) => {
        // evt: { level, scope, ts, args, code?, data? }
        console.log(JSON.stringify(evt));
      },
    },
  });

  const log = hub.logger('sync-job');
  log.debug(() => ['expensive detail only if enabled', { meta: 1 }]);
  log.code('info', 'SYNC_START', 'Starting sync', { pid: process.pid });
  //#endregion ReadmeLogging
}

// ---------------------------------------------------------------------------
// Typed Error Handling
// ---------------------------------------------------------------------------

async function _readmeErrorHandling() {
  //#region ReadmeErrorHandling
  const hub = createHubClient();

  try {
    await hub.getInfo();
  } catch (e) {
    if (isSdkError(e)) {
      switch (e.name) {
        case 'HttpSdkError':
          console.error('HTTP failure', e.status, e.operationId);
          break;
        case 'ValidationSdkError':
          console.error('Validation issue on', e.operationId, e.side, e.issues);
          break;
        case 'AuthSdkError':
          console.error('Auth problem', e.message, e.status);
          break;
        case 'CancelSdkError':
          console.error('Operation cancelled', e.operationId);
          break;
        case 'NetworkSdkError':
          console.error('Network layer error', e.message);
          break;
      }
      return;
    }
    // Non-SDK (programmer) error; rethrow or wrap
    throw e;
  }
  //#endregion ReadmeErrorHandling
}

// ---------------------------------------------------------------------------
// Result Client
// ---------------------------------------------------------------------------

async function _readmeResultClient(workspaceKey: WorkspaceKey) {
  //#region ReadmeResultClient
  const hubR = createHubResultClient();
  const res = await hubR.createProject({ name: 'Order Fulfilment', workspaceKey });
  if (isOk(res)) {
    console.log('Project key', res.value.projectKey);
  } else {
    console.error('Create failed', res.error);
  }
  //#endregion ReadmeResultClient
}

// ---------------------------------------------------------------------------
// Testing Patterns
// ---------------------------------------------------------------------------

async function _readmeTestingClient() {
  //#region ReadmeTestingClient
  const hub = createHubClient({
    config: { CAMUNDA_HUB_ADDRESS: 'http://localhost:8088', CAMUNDA_AUTH_STRATEGY: 'NONE' },
  });
  //#endregion ReadmeTestingClient
  void hub;
}

async function _readmeTestingMock() {
  //#region ReadmeTestingMock
  const hub = createHubClient({
    fetch: async (_input, _init) =>
      new Response(JSON.stringify({ version: 'v2', authorizedOrganization: 'test-org' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  });
  //#endregion ReadmeTestingMock
  void hub;
}

void _readmeQuickStart;
void _readmeOverrides;
void _readmeCustomFetch;
void _readmeWorkflow;
void _readmePagination;
void _readmeDisableRetry;
void _readmeRetryOverride;
void _readmeBrandedKeys;
void _readmeCancelable;
void _readmePerOperationFunctions;
void _readmeLogging;
void _readmeErrorHandling;
void _readmeResultClient;
void _readmeTestingClient;
void _readmeTestingMock;
