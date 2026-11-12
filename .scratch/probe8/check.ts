import type * as O from './o';
import type * as N from './n';
type _R<F> = F extends (...a: any) => infer X ? X : never;
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type W_C = _Eq<_R<typeof O.searchProjects>, _R<typeof N.searchProjects>> extends true ? unknown : _R<typeof N.searchProjects> extends _R<typeof O.searchProjects> ? never : unknown;
const W_v: W_C = undefined as never;
