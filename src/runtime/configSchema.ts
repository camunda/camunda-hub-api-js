// Canonical configuration schema (single source of truth)
// Each entry describes one environment variable exposed to users.
// Types are inferred via 'as const' and mapped to runtime & compile-time types.

export const SCHEMA = {
  CAMUNDA_HUB_ADDRESS: {
    type: 'string',
    default: 'http://localhost:8088/api/v2',
    doc: 'Base address of your Camunda Hub instance (SaaS or Self-Managed). The /api/v2 suffix is appended automatically unless already present (see CAMUNDA_HUB_ADDRESS_EXACT).',
  },
  CAMUNDA_HUB_ADDRESS_EXACT: {
    type: 'boolean',
    default: false,
    doc: 'Disable the automatic /api/v2 suffix so CAMUNDA_HUB_ADDRESS is used as the base path. The value is still normalized (surrounding whitespace and trailing slashes are trimmed). Useful for gateway/reverse-proxy deployments whose base path does not follow the /api/v2 convention.',
  },
  CAMUNDA_SDK_HTTP_RETRY_MAX_ATTEMPTS: {
    desc: 'Maximum total HTTP attempts (including the initial attempt) for transient failures (429,503, network).',
    type: 'int',
    default: 3,
  },
  CAMUNDA_SDK_HTTP_RETRY_BASE_DELAY_MS: {
    desc: 'Base delay in milliseconds for exponential backoff (full jitter) for HTTP retries.',
    type: 'int',
    default: 100,
  },
  CAMUNDA_SDK_HTTP_RETRY_MAX_DELAY_MS: {
    desc: 'Maximum delay cap in milliseconds for HTTP retry backoff.',
    type: 'int',
    default: 2000,
  },
  CAMUNDA_HUB_TOKEN_AUDIENCE: {
    type: 'string',
    default: 'api.cloud.camunda.io',
    doc: 'Token audience for OAuth flows. SaaS: api.cloud.camunda.io. Self-Managed: the audience your identity provider issues for the Hub public API (web-modeler-public-api by default).',
  },
  CAMUNDA_CLIENT_ID: {
    type: 'string',
    doc: 'OAuth client id (required when CAMUNDA_AUTH_STRATEGY=OAUTH).',
    requiredWhen: { key: 'CAMUNDA_AUTH_STRATEGY', equals: 'OAUTH' },
  },
  CAMUNDA_CLIENT_SECRET: {
    type: 'string',
    secret: true,
    doc: 'OAuth client secret (required when CAMUNDA_AUTH_STRATEGY=OAUTH).',
    requiredWhen: { key: 'CAMUNDA_AUTH_STRATEGY', equals: 'OAUTH' },
  },
  CAMUNDA_OAUTH_URL: {
    type: 'string',
    default: 'https://login.cloud.camunda.io/oauth/token',
    doc: 'OAuth token URL.',
  },
  CAMUNDA_OAUTH_GRANT_TYPE: {
    type: 'string',
    default: 'client_credentials',
    doc: 'OAuth grant type.',
  },
  CAMUNDA_OAUTH_SCOPE: {
    type: 'string',
    doc: 'Optional OAuth scope (space-separated).',
  },
  CAMUNDA_OAUTH_TIMEOUT_MS: {
    type: 'int',
    default: 5000,
    doc: 'Timeout in ms for OAuth token fetch.',
  },
  CAMUNDA_OAUTH_RETRY_MAX: {
    type: 'int',
    default: 5,
    doc: 'Maximum OAuth token fetch attempts (including initial).',
  },
  CAMUNDA_OAUTH_RETRY_BASE_DELAY_MS: {
    type: 'int',
    default: 1000,
    doc: 'Base delay (ms) for first retry (exponential backoff).',
  },
  CAMUNDA_OAUTH_CACHE_DIR: {
    type: 'string',
    doc: 'Directory for disk caching OAuth tokens (Node only).',
  },
  CAMUNDA_AUTH_STRATEGY: {
    type: 'enum',
    choices: ['NONE', 'OAUTH'] as const,
    default: 'NONE',
    doc: 'Authentication strategy. The Hub API requires a bearer JWT: use OAUTH (client credentials) against SaaS or your Self-Managed identity provider.',
  },
  CAMUNDA_SDK_VALIDATION: {
    type: 'string',
    default: 'req:none,res:none',
    doc: 'Validation mini-language controlling req/res modes.',
  },
  CAMUNDA_SDK_LOG_LEVEL: {
    type: 'enum',
    choices: ['silent', 'error', 'warn', 'info', 'debug', 'trace', 'silly'] as const,
    default: 'info',
    doc: 'SDK log level. "silly" adds unsafe deep diagnostics including HTTP request and response bodies.',
  },
  CAMUNDA_SDK_TELEMETRY_LOG: {
    type: 'boolean',
    default: false,
    doc: 'Emit telemetry (auth/http/retry) events to the SDK logger automatically (no code).',
  },
  CAMUNDA_SDK_TELEMETRY_CORRELATION: {
    type: 'boolean',
    default: false,
    doc: 'Enable correlation context (withCorrelation helper) when auto telemetry logging is on.',
  },
  CAMUNDA_MTLS_CERT_PATH: { type: 'string', doc: 'Path to client certificate (PEM) for mTLS.' },
  CAMUNDA_MTLS_KEY_PATH: { type: 'string', doc: 'Path to client private key (PEM) for mTLS.' },
  CAMUNDA_MTLS_CA_PATH: { type: 'string', doc: 'Path to CA certificate bundle (PEM) for mTLS.' },
  CAMUNDA_MTLS_KEY_PASSPHRASE: {
    type: 'string',
    secret: true,
    doc: 'Optional passphrase for encrypted private key.',
  },
  CAMUNDA_MTLS_CERT: { type: 'string', doc: 'Inline PEM client certificate.' },
  CAMUNDA_MTLS_KEY: { type: 'string', secret: true, doc: 'Inline PEM client private key.' },
  CAMUNDA_MTLS_CA: { type: 'string', doc: 'Inline PEM CA bundle.' },
  // Support logging (optional diagnostic file emission; Node-only)
  CAMUNDA_SUPPORT_LOG_ENABLED: {
    type: 'boolean',
    default: false,
    doc: 'Enable creation of a support log file with environment & configuration diagnostics (Node-only).',
  },
  CAMUNDA_SUPPORT_LOG_FILE_PATH: {
    type: 'string',
    doc: 'Override support log output file path (default: ./camunda-support.log in current working directory).',
  },
  // Backward-compatible alias (boolean) if users set CAMUNDA_SUPPORT_LOGGER=true by mistake
  CAMUNDA_SUPPORT_LOGGER: {
    type: 'boolean',
    default: false,
    doc: 'Alias for CAMUNDA_SUPPORT_LOG_ENABLED (deprecated).',
  },
} as const;

export type EnvVarKey = keyof typeof SCHEMA;

// Map schema primitive to TS type
type PrimitiveType<T> = T extends { type: 'string' }
  ? string
  : T extends { type: 'boolean' }
    ? boolean
    : T extends { type: 'int' | 'signedInt' }
      ? number
      : T extends { type: 'enum'; choices: readonly (infer C)[] }
        ? C
        : never;

export type EnvVarValue<K extends EnvVarKey> = PrimitiveType<(typeof SCHEMA)[K]>;

// Flat overrides (strongly typed values)
export type EnvOverrides = Partial<{ [K in EnvVarKey]: EnvVarValue<K> }>;

// Secret metadata accessor
export function isSecret(key: EnvVarKey): boolean {
  return !!(SCHEMA as any)[key].secret;
}
export function requiredWhen(key: EnvVarKey): { key: EnvVarKey; equals: string } | undefined {
  return (SCHEMA as any)[key].requiredWhen;
}
// Legacy env var names accepted as fallbacks for a canonical key (declared in SCHEMA).
export function aliases(key: EnvVarKey): readonly string[] {
  return (SCHEMA as any)[key].aliases ?? [];
}
export function defaultValue(key: EnvVarKey): any {
  return (SCHEMA as any)[key].default;
}
export function schemaEntry(key: EnvVarKey) {
  return (SCHEMA as any)[key];
}
export function allKeys(): EnvVarKey[] {
  return Object.keys(SCHEMA) as EnvVarKey[];
}
