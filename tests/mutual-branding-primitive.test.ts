import { describe, expect, it } from 'vitest';
import { FileKey, ProjectKey } from '../src';

describe('Key branding (structural)', () => {
  it('allows cross-assignment today (documenting gap)', () => {
    const pi = ProjectKey.assumeExists('123');
    const di = FileKey.assumeExists('456');
    // @ts-expect-error cross-assignment should be rejected
    const leak: ProjectKey = di;
    expect(leak).toBe('456');
    expect(pi).toBe('123');
  });
});
