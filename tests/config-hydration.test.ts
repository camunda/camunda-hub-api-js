import { describe, expect, it } from 'vitest';
import { CamundaConfigurationError, hydrateConfig } from '../src/runtime/unifiedConfiguration';

describe('unified configuration hydration', () => {
  it('hydrates defaults', () => {
    const { config } = hydrateConfig({ env: {} });
    expect(config.restAddress).toBe('http://localhost:8088/api/v2');
    expect(config.auth.strategy).toBe('NONE');
    expect(config.tokenAudience).toBe('api.cloud.camunda.io');
  });

  it('applies overrides precedence', () => {
    const { config } = hydrateConfig({
      env: { CAMUNDA_HUB_ADDRESS: 'http://env' },
      overrides: { CAMUNDA_HUB_ADDRESS: 'http://override' },
    });
    expect(config.restAddress).toBe('http://override/api/v2');
    const { config: config2 } = hydrateConfig({ env: { CAMUNDA_HUB_TOKEN_AUDIENCE: 'aud-a' } });
    expect(config2.tokenAudience).toBe('aud-a');
  });

  it('enforces oauth conditional requirements', () => {
    try {
      hydrateConfig({ env: { CAMUNDA_AUTH_STRATEGY: 'oauth' } });
      throw new Error('Expected error');
    } catch (e: any) {
      expect(e instanceof CamundaConfigurationError).toBe(true);
      expect(e.errors.some((d: any) => d.code === 'CONFIG_MISSING_REQUIRED')).toBe(true);
    }
  });

  it('parses validation mini-language', () => {
    const { config } = hydrateConfig({ env: { CAMUNDA_SDK_VALIDATION: 'req:strict,res:warn' } });
    expect(config.validation.req).toBe('strict');
    expect(config.validation.res).toBe('warn');
  });

  it('rejects invalid boolean', () => {
    try {
      hydrateConfig({ env: { CAMUNDA_SDK_VALIDATION_VERBOSE: 'maybe' } });
    } catch (e: any) {
      expect(e.errors.some((d: any) => d.code === 'CONFIG_INVALID_BOOLEAN')).toBe(true);
    }
  });

  it('redacts secrets', () => {
    const { redacted } = hydrateConfig({
      env: {
        CAMUNDA_AUTH_STRATEGY: 'OAUTH',
        CAMUNDA_CLIENT_ID: 'abc',
        CAMUNDA_CLIENT_SECRET: 'abcdefghijklmnop',
      },
    });
    expect(redacted.CAMUNDA_CLIENT_SECRET).toMatch(/^\*+mnop$/); // ends with last4
  });

  it('falls back to the schema default when a defaulted string var is empty', () => {
    // An explicitly empty env var must not become an empty effective value, and the
    // schema default must be applied at the rawMap stage so effective / __raw reflect it.
    const { config, effective } = hydrateConfig({ env: { CAMUNDA_HUB_TOKEN_AUDIENCE: '' } });
    expect(config.tokenAudience).toBe('api.cloud.camunda.io');
    expect(config.__raw.CAMUNDA_HUB_TOKEN_AUDIENCE).toBe('api.cloud.camunda.io');
    expect(effective.CAMUNDA_HUB_TOKEN_AUDIENCE).toBe('api.cloud.camunda.io');
  });

  it('infers OAUTH auth strategy when CAMUNDA_OAUTH_URL provided and strategy missing', () => {
    const { config } = hydrateConfig({
      env: {
        CAMUNDA_OAUTH_URL: 'https://auth.example/oauth/token',
        CAMUNDA_CLIENT_ID: 'id',
        CAMUNDA_CLIENT_SECRET: 'secret',
      },
    });
    expect(config.auth.strategy).toBe('OAUTH');
  });
});
