import { describe, expect, it } from 'vitest';
import type { CancelablePromise } from '../src';
import createClient from '../src';

const camunda = createClient({ config: { CAMUNDA_HUB_ADDRESS: 'http://localhost:8080' } });

type NotAny<T> = 0 extends 1 & T ? false : true;
type _ReturnNotAny = NotAny<ReturnType<typeof camunda.createProject>> extends true ? true : never;
type _ReturnCancelable =
  ReturnType<typeof camunda.createProject> extends CancelablePromise<any> ? true : never;

// The throwing client must NOT expose a union with Result<...>
type _ThrowModeNoUnion =
  ReturnType<typeof camunda.searchProjects> extends CancelablePromise<infer X>
    ? X extends { ok: any; value: any }
      ? never
      : true
    : never;

describe('type-signatures', () => {
  it('runtime smoke', () => {
    expect(typeof camunda.createProject).toBe('function');
    expect(typeof camunda.searchProjects.paginate).toBe('function');
  });
});
