
type A = { kind: 'a'; tag?: string };
type B = { kind: 'b'; tag?: string };
type A2 = { kind: 'a' | 'c'; tag?: string };
type A3 = { kind: 'a' | 'c' }; // widened AND tag removed
declare const a: A;
declare const a2: A2;
declare const a3: A3;
const c1: A2 = a;   // old -> widened: OK
const c2: A3 = a;   // old -> widened+tagRemoved: OK (assignability blind)
// intersection members
type IA = { kind: 'a' } & { tag?: string };
type IA2 = { kind: 'a' | 'c' } & { tag?: string };
declare const ia: IA;
declare const ia2: IA2;
const c3: IA2 = ia;  // ?
const c4: IA = ia2;  // ?
// non-discriminated
type X = { a: string };
type X2 = { a: string | number };
declare const x: X;
declare const x2: X2;
const c5: X2 = x;  // OK
