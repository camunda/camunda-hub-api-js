import type * as O from './o';
import type * as N from './n';
type _A<F> = F extends (...a: any) => infer X ? Awaited<X> : never;
declare const _c11: _A<typeof N.createProject>; const _c11_ok: _A<typeof O.createProject> = _c11;
const _c12: _Eq<_A<typeof O.createProject>, _A<typeof N.createProject>> = true;
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
