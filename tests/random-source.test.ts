import { describe, expect, it, onTestFailed } from 'vitest';
import {
  createHubClient,
  createSeededRandom,
  createTestClock,
  liveRandom,
  SEED_ENV_VAR,
  type SeededRandom,
  seededRandomFromEnv,
} from '../src';

/** Seed 42's first draws, pinned by the cross-SDK contract (camunda/sdk-infra#50). */
const SEED_42 = [
  0.7415648787718233, 0.1599103928769201, 0.27860113025513866, 0.34419071652363753,
  0.03803016854024621,
];

/** A seeded source from `CAMUNDA_TEST_SEED` (or a fresh seed) that names itself on failure. */
function reportedSeed(): SeededRandom {
  const random = seededRandomFromEnv();
  onTestFailed(() => {
    process.stderr.write(`${random}\n`);
  });
  return random;
}

describe('createSeededRandom', () => {
  it('matches the published SplitMix64 reference', () => {
    // SplitMix64 with seed 0 emits 0xE220A8397B1DCDAF first (Vigna's reference implementation).
    expect(createSeededRandom(0).next()).toBe(Number(0xe220a8397b1dcdafn >> 11n) * 2 ** -53);
  });

  it('matches the cross-SDK conformance vector', () => {
    const random = createSeededRandom(42);
    expect(SEED_42.map(() => random.next())).toEqual(SEED_42);
  });

  it('accepts a bigint seed across the full unsigned 64-bit range', () => {
    expect(createSeededRandom(42n).next()).toBe(SEED_42[0]);
    expect(createSeededRandom((1n << 64n) - 1n).seed).toBe((1n << 64n) - 1n);
  });

  it.each([-1, -1n, 1n << 64n])('rejects %s as a seed', (seed) => {
    expect(() => createSeededRandom(seed)).toThrow(RangeError);
  });

  it('replays the same sequence from the same seed', () => {
    const random = reportedSeed();
    const replay = createSeededRandom(random.seed);
    for (let i = 0; i < 1_000; i++) expect(random.next()).toBe(replay.next());
  });

  it('draws stay in [0, 1)', () => {
    const random = reportedSeed();
    for (let i = 0; i < 100_000; i++) {
      const u = random.next();
      if (!(u >= 0 && u < 1)) throw new Error(`draw ${i} = ${u} is outside [0, 1) (${random})`);
    }
  });

  it('names the seed and how to replay it', () => {
    expect(String(createSeededRandom(12345))).toBe(
      'SeededRandom(seed=12345; replay with CAMUNDA_TEST_SEED=12345)'
    );
  });
});

describe('seededRandomFromEnv', () => {
  it('replays the seed from the environment', () => {
    const random = seededRandomFromEnv({ [SEED_ENV_VAR]: '42' });
    expect(random.seed).toBe(42n);
    expect(random.next()).toBe(SEED_42[0]);
  });

  it('draws a fresh seed only when the variable is unset', () => {
    expect(typeof seededRandomFromEnv({}).seed).toBe('bigint');
  });

  it.each(['', ' ', ' 42', '42\n', '-1', '0x2A', 'abc', '18446744073709551616'])(
    'rejects %j rather than silently picking another seed',
    (raw) => {
      expect(() => seededRandomFromEnv({ [SEED_ENV_VAR]: raw })).toThrow(SEED_ENV_VAR);
    }
  );
});

describe('injected random source', () => {
  const baseConfig = {
    CAMUNDA_HUB_ADDRESS: 'https://example.com',
    CAMUNDA_AUTH_STRATEGY: 'NONE',
    CAMUNDA_SDK_LOG_LEVEL: 'silent',
  } as const;

  it('defaults to the live source', () => {
    expect(createHubClient({ config: { ...baseConfig } as any }).random).toBe(liveRandom);
  });

  it('exposes the injected source', () => {
    const random = createSeededRandom(1);
    expect(createHubClient({ config: { ...baseConfig } as any, random }).random).toBe(random);
  });

  /** Full jitter over the capped backoff: seed 42 draws 0.7415... of a 10s cap. */
  it('drives HTTP retry backoff', async () => {
    const clock = createTestClock();
    let calls = 0;
    const camunda = createHubClient({
      config: {
        ...baseConfig,
        CAMUNDA_SDK_HTTP_RETRY_BASE_DELAY_MS: 10_000,
        CAMUNDA_SDK_HTTP_RETRY_MAX_DELAY_MS: 60_000,
      } as any,
      clock,
      random: createSeededRandom(42),
      fetch: (async () =>
        ++calls === 1
          ? new Response('{}', { status: 429, headers: { 'content-type': 'application/json' } })
          : new Response('{}', {
              status: 200,
              headers: { 'content-type': 'application/json' },
            })) as any,
    });

    await camunda.getInfo();

    expect(calls).toBe(2);
    expect(clock.sleeps).toEqual([7_415]);
  });

  /** ±10% around the doubling backoff: seed 42 adds (0.7415... - 0.5) * 20% of 10s. */
  it('drives OAuth retry backoff', async () => {
    const clock = createTestClock();
    let tokenCalls = 0;
    const camunda = createHubClient({
      config: {
        CAMUNDA_HUB_ADDRESS: 'https://api.test',
        CAMUNDA_AUTH_STRATEGY: 'OAUTH',
        CAMUNDA_OAUTH_URL: 'https://example.test/oauth/token',
        CAMUNDA_HUB_TOKEN_AUDIENCE: 'aud',
        CAMUNDA_CLIENT_ID: 'cid',
        CAMUNDA_CLIENT_SECRET: 'sec',
        CAMUNDA_OAUTH_RETRY_MAX: 3,
        CAMUNDA_OAUTH_RETRY_BASE_DELAY_MS: 10_000,
        CAMUNDA_SDK_LOG_LEVEL: 'silent',
      } as any,
      clock,
      random: createSeededRandom(42),
      fetch: (async () =>
        ++tokenCalls === 1
          ? new Response('{"error":"temporary"}', { status: 500 })
          : new Response('{"access_token":"ok","expires_in":3600}', { status: 200 })) as any,
    });

    await camunda.getAuthHeaders();

    expect(tokenCalls).toBe(2);
    expect(clock.sleeps).toHaveLength(1);
    expect(clock.sleeps[0]).toBeCloseTo(10_483.13, 2);
  });
});
