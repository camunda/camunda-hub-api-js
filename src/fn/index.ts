/**
 * Standalone, tree-shakeable operation functions.
 *
 * ```ts
 * import { createHubCore, getInfo } from '@camunda8/hub-api/fn';
 *
 * const core = createHubCore(); // same options as createHubClient()
 * const info = await getInfo(core);
 * ```
 *
 * Each function takes the core as its first argument, then exactly the arguments of
 * the `HubClient` method of the same name, and behaves identically: the class
 * methods delegate to these functions. Bundlers keep only the operations you import,
 * plus the zod schemas those operations validate with (loaded lazily, and only when
 * validation is enabled). One caveat: this relies on the bundler tree-shaking dead
 * dynamic-`import()` targets (Rollup, or esbuild without code splitting). esbuild's
 * `splitting: true` mode retains the `import()` targets of unimported operations, so a
 * code-split esbuild build may still include schema chunks for operations you did not
 * import; prefer an unsplit build (or Rollup) when minimal bundles matter.
 *
 * A `HubClient` is also a `HubCore`, so these functions accept an existing
 * client too.
 *
 * @module
 */
export * from '../gen/operations.gen';
export type { CancelablePromise } from '../runtime/cancelable';
export { createHubCore, HubCore, type HubOptions } from '../runtime/hubCore';
export type { OperationOptions } from '../runtime/retry';
