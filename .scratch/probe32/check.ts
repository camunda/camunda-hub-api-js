import type * as O_fn_index from './o/fn/index';
import type * as N_fn_index from './n/fn/index';
type _A<F> = F extends (...a: any) => infer X ? Awaited<X> : never;
declare const _c11: _A<typeof N_fn_index.createProject>; const _c11_ok: _A<typeof O_fn_index.createProject> = _c11;
