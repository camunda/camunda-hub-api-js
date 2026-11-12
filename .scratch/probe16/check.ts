
interface ProjectResult { projectKey: string; name: string; }
interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type EqW = _Eq<CancelablePromise<ProjectResult>, Promise<ProjectResult>>;
type Inner = Promise<ProjectResult> extends CancelablePromise<ProjectResult> ? never : unknown;
declare const i: Inner;
const p1: 'x' = i;   // error iff Inner = unknown
const p2: Inner = 'x'; // error iff Inner = never
