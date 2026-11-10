// TEMPLATE: Canonical Hub client class template (manually maintained)
// TEMPLATE: DO NOT add generated operation methods here; generator will produce HubClient.ts from this template.

import type * as Sdk from '../gen/sdk.gen';
import type { CancelablePromise } from '../runtime/cancelable';
import { HubCore, type HubOptions } from '../runtime/hubCore';
import type { OperationOptions } from '../runtime/retry';
import { installSearchPagination, type WithSearchPagination } from '../runtime/searchPagination';

// === AUTO-GENERATED HUB SUPPORT TYPES START ===
// (generation inserts helper & per-operation option/body types here)
// === AUTO-GENERATED HUB SUPPORT TYPES END ===

// Cancelable primitive (kept lightweight & local)
export class CancelError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'CancelError';
  }
}
export type { CancelablePromise, HubOptions };

/** Create a {@link HubClient} for the Camunda Hub REST API. */
export function createHubClient(options?: HubOptions): HubClient {
  return new HubClient(options);
}

/**
 * The Hub client's operation methods. Create clients with {@link createHubClient}
 * or {@link HubClient}, which add `.paginate(...)` to every search operation.
 */
export class HubClientBase extends HubCore {
  constructor(opts: HubOptions = {}) {
    // Discriminate the full client from bare `HubCore` (and consumer subclasses of
    // it) for support diagnostics — see `HubOptions.__hubComponent`.
    super({ ...opts, __hubComponent: 'HubClient' });
    // Attach `.paginate` to every search* operation. One well-known wiring point;
    // discovers search methods generically (no per-op list).
    installSearchPagination(this);
  }

  // === AUTO-GENERATED HUB METHODS START ===
  // === AUTO-GENERATED HUB METHODS END ===
}

/**
 * Public Hub client type: the base class augmented with `.paginate(...)` on
 * every `search*` operation. The `.paginate` methods are installed at runtime by
 * the constructor (via `installSearchPagination`), so both construction paths —
 * the `createHubClient` factory *and* direct `new HubClient()` — yield a value
 * whose static type matches the runtime shape.
 *
 * This is expressed as a separate type + value pair rather than
 * declaration-merging an interface onto the class because
 * `SearchPaginationApi<HubClient>` is self-referential (it maps over
 * `keyof HubClient`), which TypeScript rejects as an interface `extends`
 * clause ("recursively references itself as a base type").
 */
export type HubClient = WithSearchPagination<HubClientBase>;
export const HubClient = HubClientBase as unknown as {
  new (options?: HubOptions): HubClient;
} & typeof HubClientBase;
