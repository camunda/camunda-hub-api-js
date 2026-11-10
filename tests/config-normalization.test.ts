import { describe, expect, it } from 'vitest';
import { hydrateConfig } from '../src/runtime/unifiedConfiguration';

describe('Hub address /api/v2 normalization', () => {
  it('defaults to a local Hub at http://localhost:8088/api/v2', () => {
    const { config } = hydrateConfig({ env: {} });
    expect(config.restAddress).toBe('http://localhost:8088/api/v2');
  });

  it('appends /api/v2 when missing', () => {
    const { config } = hydrateConfig({ env: { CAMUNDA_HUB_ADDRESS: 'http://host:8088' } });
    expect(config.restAddress).toBe('http://host:8088/api/v2');
  });

  it('strips trailing slashes before appending', () => {
    const { config } = hydrateConfig({ env: { CAMUNDA_HUB_ADDRESS: 'http://host:8088//' } });
    expect(config.restAddress).toBe('http://host:8088/api/v2');
  });

  it('does not double-append when already ending with /api/v2', () => {
    const { config } = hydrateConfig({ env: { CAMUNDA_HUB_ADDRESS: 'http://host:8088/api/v2' } });
    expect(config.restAddress).toBe('http://host:8088/api/v2');
  });

  it('accepts a trailing slash after /api/v2', () => {
    const { config } = hydrateConfig({ env: { CAMUNDA_HUB_ADDRESS: 'http://host:8088/api/v2/' } });
    expect(config.restAddress).toBe('http://host:8088/api/v2/');
  });
});

describe('CAMUNDA_HUB_ADDRESS_EXACT (opt out of /api/v2 suffix)', () => {
  it('does not append /api/v2 when exact mode is enabled via env', () => {
    const { config } = hydrateConfig({
      env: {
        CAMUNDA_HUB_ADDRESS: 'https://gateway.example/hub',
        CAMUNDA_HUB_ADDRESS_EXACT: 'true',
      },
    });
    expect(config.restAddress).toBe('https://gateway.example/hub');
  });

  it('does not append /api/v2 when exact mode is enabled via config object', () => {
    const { config } = hydrateConfig({
      overrides: {
        CAMUNDA_HUB_ADDRESS: 'https://gateway.example/hub',
        CAMUNDA_HUB_ADDRESS_EXACT: true,
      },
    });
    expect(config.restAddress).toBe('https://gateway.example/hub');
  });

  it('strips a trailing slash in exact mode to avoid double-slash request paths', () => {
    const { config } = hydrateConfig({
      env: {
        CAMUNDA_HUB_ADDRESS: 'https://gateway.example/hub/',
        CAMUNDA_HUB_ADDRESS_EXACT: 'true',
      },
    });
    expect(config.restAddress).toBe('https://gateway.example/hub');
  });

  it('still appends /api/v2 when exact mode is explicitly false', () => {
    const { config } = hydrateConfig({
      env: {
        CAMUNDA_HUB_ADDRESS: 'https://gateway.example/hub',
        CAMUNDA_HUB_ADDRESS_EXACT: 'false',
      },
    });
    expect(config.restAddress).toBe('https://gateway.example/hub/api/v2');
  });
});
