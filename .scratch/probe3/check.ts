import type * as O from './o';
import type * as N from './n';
declare const uo: O.U;
declare const un: N.U;
const t1: N.U = uo;   // old union -> new union: OK expected
declare const a: O.A;
declare const a2: N.A2;
const t2: N.A2 = a;   // old branch -> new widened branch: OK expected
const t3: O.A = a2;   // new -> old: error expected
