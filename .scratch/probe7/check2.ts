import type * as O from './o2';
import type * as N from './n2';
type _R<F> = F extends (...a: any) => infer X ? X : never;
declare const a: _R<typeof O.searchProjects>;
const a_ok: _R<typeof N.searchProjects> = a;
