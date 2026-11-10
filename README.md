# Camunda Hub TypeScript SDK

[![npm](https://img.shields.io/npm/v/@camunda8/hub-api)](https://www.npmjs.com/package/@camunda8/hub-api)

Type-safe, promise-based client for the **Camunda Hub Public API (v2)**: workspaces, members, projects, folders, files, versions, project snapshots, the catalog, environments and cluster registrations.

The client is generated from the Hub OpenAPI specification with the same pipeline as the [Orchestration Cluster TypeScript SDK](https://github.com/camunda/orchestration-cluster-api-js), and shares its runtime conventions: `CAMUNDA_*` environment configuration, OAuth token management, typed errors, retries with backoff, opt-in schema validation and structured logging.

## Highlights

- Strong TypeScript types for every request and response, generated from the spec
- Branded key types (`WorkspaceKey`, `ProjectKey`, `FileKey`, …) so keys of different resources cannot be mixed up
- Zero-config construction from `CAMUNDA_*` environment variables (12-factor style)
- OAuth 2.0 client credentials with token caching and single-flight refresh
- `.paginate()` on every search operation
- Automatic retry with exponential backoff and jitter for transient failures (network errors, 429, 503)
- Optional request/response validation with Zod (`CAMUNDA_SDK_VALIDATION`)
- Cancelable promises, a typed `SdkError` union, and a non-throwing `Result` client
- Tree-shakeable per-operation functions (`@camunda8/hub-api/fn`)
- Runs on Node.js, Deno, Bun and in browsers (`fetch`-based)

## Install

```bash
npm install @camunda8/hub-api
```

Requires Node.js 22 or newer. The package ships ESM and CommonJS builds with type declarations.

## Quick Start (Zero-Config – Recommended)

Keep configuration out of application code. Let the factory read `CAMUNDA_*` variables from the environment.

<!-- snippet-source: examples/readme-imports.txt,examples/readme.ts | regions: ReadmeDefaultImport+ReadmeQuickStart -->

```ts
import createHubClient from '@camunda8/hub-api';

// Zero-config construction: reads CAMUNDA_* from process.env.
// With no configuration it targets a local Hub at http://localhost:8088/api/v2.
const hub = createHubClient();

const info = await hub.getInfo();
console.log(`Hub API ${info.version}, organization ${info.authorizedOrganization}`);
```

Typical `.env` for Camunda SaaS:

```bash
CAMUNDA_HUB_ADDRESS=https://<your-hub-host>   # /api/v2 is appended automatically
CAMUNDA_AUTH_STRATEGY=OAUTH
CAMUNDA_CLIENT_ID=***
CAMUNDA_CLIENT_SECRET=***
# CAMUNDA_OAUTH_URL=https://login.cloud.camunda.io/oauth/token   # default
# CAMUNDA_HUB_TOKEN_AUDIENCE=api.cloud.camunda.io                # default
```

For Self-Managed, point `CAMUNDA_OAUTH_URL` at your identity provider's token endpoint and set `CAMUNDA_HUB_TOKEN_AUDIENCE` to the audience your Hub instance expects (for example `web-modeler-public-api`).

`CAMUNDA_HUB_ADDRESS` is normalized to end in `/api/v2`. Set `CAMUNDA_HUB_ADDRESS_EXACT=true` to use the address as given, for gateways or reverse proxies that rewrite the base path.

Every supported variable, with its default, is listed in [documentation/CONFIG_REFERENCE.md](documentation/CONFIG_REFERENCE.md).

### Authentication

The Hub API requires a bearer JWT on every request.

| `CAMUNDA_AUTH_STRATEGY` | Behaviour                                                                                                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OAUTH`                 | Fetches a token with the OAuth 2.0 client credentials grant from `CAMUNDA_OAUTH_URL`, caches it in memory (and optionally on disk via `CAMUNDA_OAUTH_CACHE_DIR`, Node only), and refreshes it before expiry. Concurrent requests share one refresh. |
| `NONE` (default)        | Sends no `Authorization` header. Use this behind a gateway that injects credentials, or add your own header with a custom `fetch`.                                                                                                                  |

When `CAMUNDA_CLIENT_ID` and `CAMUNDA_CLIENT_SECRET` are set and `CAMUNDA_AUTH_STRATEGY` is not, the client uses `OAUTH`.

### Programmatic Overrides

Pass `config` to override any environment value. Explicit values win over the environment.

<!-- snippet-source: examples/readme.ts | regions: ReadmeOverrides -->

```ts
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
```

### Custom Fetch Implementation

<!-- snippet-source: examples/readme.ts | regions: ReadmeCustomFetch -->

```ts
const hub = createHubClient({
  fetch: (input, init) => {
    // inspect / modify request here
    return fetch(input, init);
  },
});
```

## Usage

Every operation in the API is a method on the client. Path parameters, query parameters and the request body are passed together as one flat object.

<!-- snippet-source: examples/readme.ts | regions: ReadmeWorkflow -->

```ts
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
```

Each method's JSDoc carries a compilable example (from [examples/](examples/)), so your editor shows usage on hover.

### Branded Keys

Resource keys are branded strings: the compiler rejects a `WorkspaceKey` where a `ProjectKey` is expected. Keys returned by the API are already branded. To brand a key you got elsewhere (configuration, a URL, a database), use `assumeExists`:

<!-- snippet-source: examples/readme.ts | regions: ReadmeBrandedKeys -->

```ts
const workspaceKey = WorkspaceKey.assumeExists('0108f0ef-5c76-4a75-a602-45a9f04554fd');
// @ts-expect-error – a WorkspaceKey is not a ProjectKey
const bad: ProjectKey = workspaceKey;
```

Key types: `WorkspaceKey`, `ProjectKey`, `FolderKey`, `FileKey`, `VersionKey`, `ProjectSnapshotKey`, `CatalogAssetKey`, `MemberEmail`.

### Pagination

Search operations take an optional `page: { from, limit }` (offset pagination) and return `{ items, page: { totalItems, hasMoreTotalItems } }`. `hasMoreTotalItems: true` means `totalItems` was capped and is a lower bound. Every search method also has a `.paginate()` helper that fetches the pages for you:

<!-- snippet-source: examples/readme.ts | regions: ReadmePagination -->

```ts
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
```

### Cancelable Operations

Every method returns a `CancelablePromise`:

<!-- snippet-source: examples/readme.ts | regions: ReadmeCancelable -->

```ts
const p = hub.searchProjects({ filter: { workspaceKey } });
setTimeout(() => p.cancel(), 100); // best-effort cancel
try {
  await p; // resolves if not cancelled
} catch (e) {
  if (isSdkError(e) && e.name === 'CancelSdkError') {
    console.log('Operation cancelled');
  } else throw e;
}
```

### Per-Operation Functions (Tree-Shakeable)

For bundle-size-sensitive applications, import individual operations from `@camunda8/hub-api/fn`. Each function takes a core (or a `HubClient`) as its first argument, so your bundle includes only the operations you call.

<!-- snippet-source: examples/readme.ts | regions: ReadmePerOperationFunctionsImport+ReadmePerOperationFunctions -->

```ts
import { createHubCore, createProject, getInfo } from '@camunda8/hub-api/fn';

// Same options as createHubClient(); a HubClient also works as the core.
const core = createHubCore();

const info = await getInfo(core);
console.log(info.version);

const project = await createProject(core, { name: 'Order Fulfilment', workspaceKey });
console.log(project.projectKey);
```

## Error Handling

SDK errors form a discriminated union (`SdkError`), narrowed with `isSdkError` and `e.name`:

<!-- snippet-source: examples/readme.ts | regions: ReadmeErrorHandling -->

```ts
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
```

HTTP errors carry the RFC 9457 problem details returned by the API (`type`, `title`, `status`, `detail`, `instance`).

### Result Client (No Throw)

If you prefer not to use exceptions, `createHubResultClient()` returns `Result<T>` values instead:

<!-- snippet-source: examples/readme.ts | regions: ReadmeResultClient -->

```ts
const hubR = createHubResultClient();
const res = await hubR.createProject({ name: 'Order Fulfilment', workspaceKey });
if (isOk(res)) {
  console.log('Project key', res.value.projectKey);
} else {
  console.error('Create failed', res.error);
}
```

## Retry

The client retries transient failures: network errors, `429 Too Many Requests` and `503 Service Unavailable`. Other errors, including `500`, fail immediately. Backoff is exponential with full jitter:

| Variable                               | Default | Meaning                             |
| -------------------------------------- | ------- | ----------------------------------- |
| `CAMUNDA_SDK_HTTP_RETRY_MAX_ATTEMPTS`  | `3`     | Total attempts, including the first |
| `CAMUNDA_SDK_HTTP_RETRY_BASE_DELAY_MS` | `100`   | Base delay for the backoff          |
| `CAMUNDA_SDK_HTTP_RETRY_MAX_DELAY_MS`  | `2000`  | Cap on a single delay               |

Override per call with the trailing options argument.

### Disable Retry for a Single Call

<!-- snippet-source: examples/readme.ts | regions: ReadmeDisableRetry -->

```ts
// This call will not retry on transient errors
await hub.deleteProject({ projectKey }, { retry: false });
```

### Override Retry Settings for a Single Call

<!-- snippet-source: examples/readme.ts | regions: ReadmeRetryOverride -->

```ts
// More aggressive retry for this operation only
await hub.createProject(
  { name: 'Order Fulfilment', workspaceKey },
  { retry: { maxAttempts: 8, maxDelayMs: 5000 } }
);

// Minimal retry: single retry with short backoff
await hub.getInfo({ retry: { maxAttempts: 2, baseDelayMs: 50 } });
```

## Validation

Validation of requests and responses against the spec's Zod schemas is opt-in, controlled by `CAMUNDA_SDK_VALIDATION`:

```bash
CAMUNDA_SDK_VALIDATION=req:strict,res:warn
```

| Mode             | Behaviour                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `none` (default) | No validation; schemas are never loaded                                                           |
| `warn`           | Validate and log a warning on failure, then continue                                              |
| `strict`         | Validate and throw a `ValidationSdkError` on failure (an invalid request fails before it is sent) |
| `fanatical`      | Responses only: `strict`, and also reject properties the spec does not declare                    |

Schemas are loaded lazily per operation, so leaving validation off adds no bundle or start-up cost.

## Logging

The SDK logs through a pluggable transport. Set the level with `CAMUNDA_SDK_LOG_LEVEL` (`silent`, `error`, `warn`, `info`, `debug`, `trace`, `silly`) or in code:

<!-- snippet-source: examples/readme.ts | regions: ReadmeLogging -->

```ts
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
```

`silly` logs request and response bodies, which can include sensitive data. Use it only for local debugging.

### Support Logger (Node Only)

Set `CAMUNDA_SUPPORT_LOG_ENABLED=true` to write a diagnostics file (`./camunda-support.log` by default) with the SDK version, runtime and redacted configuration, to attach to support requests.

## mTLS

Node.js only. Provide a client certificate and key either as file paths (`CAMUNDA_MTLS_CERT_PATH`, `CAMUNDA_MTLS_KEY_PATH`, `CAMUNDA_MTLS_CA_PATH`) or as inline PEM (`CAMUNDA_MTLS_CERT`, `CAMUNDA_MTLS_KEY`, `CAMUNDA_MTLS_CA`), plus `CAMUNDA_MTLS_KEY_PASSPHRASE` for an encrypted key.

## Testing

Point the client at a local or stub server:

<!-- snippet-source: examples/readme.ts | regions: ReadmeTestingClient -->

```ts
const hub = createHubClient({
  config: { CAMUNDA_HUB_ADDRESS: 'http://localhost:8088', CAMUNDA_AUTH_STRATEGY: 'NONE' },
});
```

Or inject a `fetch` that returns canned responses:

<!-- snippet-source: examples/readme.ts | regions: ReadmeTestingMock -->

```ts
const hub = createHubClient({
  fetch: async (_input, _init) =>
    new Response(JSON.stringify({ version: 'v2', authorizedOrganization: 'test-org' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
});
```

## API Specification

The client is generated from the Camunda Hub Public API OpenAPI specification. A bundled copy is vendored in [external-spec/bundled/](external-spec/bundled/); [spec-metadata.json](external-spec/bundled/spec-metadata.json) records the source commit. `SPEC_HASH` (exported from the package) identifies the spec a build was generated from.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to regenerate the client, run the tests and make a release.

## License

Apache-2.0. See [LICENSE](LICENSE).
