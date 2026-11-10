// Entry point: export the Hub client, key types, and errors.
import { createHubClient } from './gen/HubClient';
import { createHubClientLoose, type HubClientLoose, type Loose } from './loose';

// Re-export all public types from HubClient (Input types, CancelablePromise, etc.)
export * from './gen/HubClient';
export { SPEC_HASH } from './gen/specHash';
export * from './gen/types.gen';
export {
  createHubResultClient,
  type HubResultClient,
  isErr,
  isOk,
  type Result,
} from './resultClient';
export {
  type Clock,
  createLiveClock,
  createTestClock,
  type HandlerClock,
  liveClock,
  type TestClock,
} from './runtime/clock';
export type {
  AuthSdkError,
  CancelSdkError,
  HttpSdkError,
  NetworkSdkError,
  SdkError,
  ValidationSdkError,
} from './runtime/errors';
export {
  CamundaValidationError,
  isSdkError,
} from './runtime/errors';
export { createHubCore, HubCore, type HubOptions } from './runtime/hubCore';
export type { CreateLoggerOptions } from './runtime/logger';
// Pagination engine: the low-level escape hatch (`nextPageRequest`, `paginate`)
// plus the public types describing `.paginate(...)` on every search operation.
export {
  type FetchPage,
  nextPageRequest,
  type PaginateOptions,
  type PaginationMode,
  type Paginator,
  paginate,
  type SearchBody,
  type SearchPageRequest,
  type SearchPageResponse,
  type SearchResponse,
} from './runtime/pagination';
export {
  createSeededRandom,
  liveRandom,
  type RandomSource,
  SEED_ENV_VAR,
  type SeededRandom,
  seededRandomFromEnv,
} from './runtime/random';
export type { HttpRetryPolicy, OperationOptions } from './runtime/retry';
export type {
  SearchPaginateOptions,
  SearchPaginationApi,
  WithSearchPagination,
} from './runtime/searchPagination';
export type { SupportLogger } from './runtime/supportLogger';
export type {
  TelemetryAuthErrorEvent,
  TelemetryAuthStartEvent,
  TelemetryAuthSuccessEvent,
  TelemetryHooks,
  TelemetryHttpEndEvent,
  TelemetryHttpErrorEvent,
  TelemetryHttpStartEvent,
  TelemetryRetryEvent,
} from './runtime/telemetry';
// Runtime types used in public signatures
export {
  type AuthStrategy,
  CamundaConfigurationError,
  type ConfigErrorCode,
  type ConfigErrorDetail,
  type HubConfig,
  type ValidationMode,
} from './runtime/unifiedConfiguration';
export { createHubClientLoose, type HubClientLoose, type Loose };
export default createHubClient;
