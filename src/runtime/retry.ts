// Generic HTTP retry abstraction.
// Allows pluggable strategy via HubClient.configure in future.
import { type Clock, liveClock } from './clock';
import type { Logger } from './logger';
import { liveRandom, type RandomSource } from './random';

export interface RetryContext {
  attempt: number; // 1-based
  maxAttempts: number;
  lastError?: any;
}

export type RetryStrategy = <T>(
  op: () => Promise<T>,
  classify?: (err: any) => RetryClassification
) => Promise<T>;

export type RetryClassification =
  | { retryable: true; reason: string }
  | { retryable: false; reason: string };

export interface HttpRetryPolicy {
  maxAttempts: number; // total attempts including first
  baseDelayMs: number; // initial backoff
  maxDelayMs: number; // cap
}

/** Per-call options for individual SDK method invocations. */
export interface OperationOptions {
  /** Override retry behaviour for this call.
   *  - Pass `false` to disable retry entirely (single attempt).
   *  - Pass a partial policy to override specific fields (merged with global config).
   */
  retry?: Partial<HttpRetryPolicy> | false;
}

export interface CreateRetryOptions {
  policy: HttpRetryPolicy;
  logger?: Logger;
  clock?: Clock;
  onAttempt?(info: { attempt: number; nextDelayMs: number; reason: string }): void;
  random?: () => number; // for test determinism
}

export function createRetryExecutor(opts: CreateRetryOptions): RetryStrategy {
  const rand = opts.random ?? (() => liveRandom.next());
  const clock = opts.clock ?? liveClock;
  return async function execute<T>(
    op: () => Promise<T>,
    classify?: (err: any) => RetryClassification
  ): Promise<T> {
    const { maxAttempts, baseDelayMs, maxDelayMs } = opts.policy;
    let attempt = 0;
    let lastErr: any;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        return await op();
      } catch (e: any) {
        lastErr = e;
        if (attempt >= maxAttempts) break;
        const decision = classify ? classify(e) : defaultHttpClassifier(e);
        if (!decision.retryable) break;
        // exponential backoff with full jitter
        const exp = baseDelayMs * 2 ** (attempt - 1);
        const cap = Math.min(exp, maxDelayMs);
        const delay = Math.floor(rand() * cap);
        try {
          opts.onAttempt?.({ attempt, nextDelayMs: delay, reason: decision.reason });
          opts.logger?.trace(() => [
            'http.retry.scheduled',
            { attempt: attempt + 1, max: maxAttempts, delayMs: delay, reason: decision.reason },
          ]);
        } catch {
          /* swallow logging errors */
        }
        await clock.sleep(delay);
      }
    }
    throw lastErr;
  };
}

// Default classifier: network errors and HTTP 429/503 are retryable; everything else
// (including errors explicitly marked `nonRetryable`) is not.
export function defaultHttpClassifier(err: any): RetryClassification {
  if (err) {
    if (err.nonRetryable) return { retryable: false, reason: 'explicit-non-retryable' };
    const msg = (err.message || '').toLowerCase();
    if (err.name === 'TypeError' && (msg.includes('fetch') || msg.includes('network'))) {
      return { retryable: true, reason: 'network-error' };
    }
    const status = err.status || err.response?.status;
    if (status === 429) return { retryable: true, reason: 'http-429' };
    if (status === 503) return { retryable: true, reason: 'http-503' };
    if (status === 500) return { retryable: false, reason: 'http-500' };
  }
  return { retryable: false, reason: 'non-retryable' };
}

export async function executeWithHttpRetry<T>(
  fn: () => Promise<T>,
  policy: HttpRetryPolicy,
  logger?: Logger,
  classify: (err: any) => RetryClassification = defaultHttpClassifier,
  onAttempt?: (info: { attempt: number; nextDelayMs: number; reason: string }) => void,
  clock?: Clock,
  random?: RandomSource
): Promise<T> {
  // Use internal executor directly for deterministic single-attempt behavior on non-retryable errors.
  const exec = createRetryExecutor({
    policy,
    logger,
    onAttempt,
    clock,
    random: random && (() => random.next()),
  });
  return exec(fn, classify);
}
