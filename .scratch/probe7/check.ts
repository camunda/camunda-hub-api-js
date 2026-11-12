import type * as O from './o';
import type * as N from './n';
type _R<F> = F extends (...a: any) => infer X ? X : never;
declare const a: _R<typeof O.searchProjects>;
const a_ok: _R<typeof N.searchProjects> = a;
declare const b: _R<typeof N.searchProjects>;
const b_ok: _R<typeof O.searchProjects> = b;
