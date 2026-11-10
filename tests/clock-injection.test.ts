import { describe, expect, it } from 'vitest';
import { createHubClient } from '../src';
import { createTestClock, liveClock } from '../src/runtime/clock';

const baseConfig = {
  CAMUNDA_HUB_ADDRESS: 'https://example.com',
  CAMUNDA_AUTH_STRATEGY: 'NONE',
} as const;

describe('clock injection point', () => {
  /**
   * Each client gets its own live clock rather than the shared `liveClock`. Slew state is
   * mutable and per-clock, so one client absorbing a backward correction would otherwise
   * shift every other client's deadlines.
   */
  it('defaults to a live clock that is not shared between clients', () => {
    const a = createHubClient({ config: { ...baseConfig } as any });
    const b = createHubClient({ config: { ...baseConfig } as any });

    expect(a.clock).not.toBe(b.clock);
    expect(a.clock).not.toBe(liveClock);
    expect(a.clock.now()).toBeGreaterThan(0);
  });

  it('exposes the injected clock', () => {
    const clock = createTestClock({ start: 1_000 });
    const camunda = createHubClient({ config: { ...baseConfig } as any, clock });

    expect(camunda.clock).toBe(clock);
  });

  /**
   * Asserting only that the client stores the clock would pass even with nothing wired to
   * it, so this drives a real request: a 429 makes the retry loop back off, and that
   * backoff must sleep on the injected clock (virtual time), not the ambient one.
   */
  it('is the time source the retry path sleeps on, not the ambient clock', async () => {
    const clock = createTestClock({ start: 1_000 });
    let n = 0;
    const fetch = (async () => {
      n++;
      return n === 1
        ? new Response('{}', { status: 429, headers: { 'content-type': 'application/json' } })
        : new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    }) as any;
    const camunda = createHubClient({
      config: { ...baseConfig, CAMUNDA_SDK_HTTP_RETRY_BASE_DELAY_MS: 60_000 } as any,
      clock,
      fetch,
    });

    expect(clock.sleeps).toEqual([]);

    await camunda.getInfo();

    expect(n).toBe(2);
    expect(clock.sleeps.length).toBe(1);
    expect(clock.sleeps[0]).toBeGreaterThan(0);
  });
});
