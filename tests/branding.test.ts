import { describe, expect, it } from 'vitest';
import { ProjectKey, WorkspaceKey } from '../src';

// compile-time only test helpers (no runtime execution for type errors)
describe('branding nominal incompatibility', () => {
  it('namespace create produces nominal objects not inter-assignable (compile-time)', () => {
    const raw = '123456';
    const pik: ProjectKey = ProjectKey.assumeExists(raw);
    const pdk: WorkspaceKey = WorkspaceKey.assumeExists(raw);
    expect(ProjectKey.getValue(pik)).toBe(raw);
    expect(WorkspaceKey.getValue(pdk)).toBe(raw);
    // @ts-expect-error deliberate mismatch: assigning WorkspaceKey to ProjectKey variable
    const shouldError: ProjectKey = pdk;
    void shouldError;
  });
});
