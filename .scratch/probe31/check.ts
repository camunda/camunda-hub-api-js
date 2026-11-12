import type * as O_fn_index from './o/fn/index';
import type * as N_fn_index from './n/fn/index';
type _A<F> = F extends (...a: any) => infer X ? Awaited<X> : never;
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
declare const _c11: _A<typeof N_fn_index.createProject>; const _c11_ok: _A<typeof O_fn_index.createProject> = _c11;
const _c12: _Eq<_A<typeof O_fn_index.createProject>, _A<typeof N_fn_index.createProject>> = true;
