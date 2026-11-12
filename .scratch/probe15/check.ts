
interface ProjectResult { projectKey: string; name: string; }
interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
type _Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type EqW = _Eq<CancelablePromise<ProjectResult>, Promise<ProjectResult>>;
type C = EqW extends true ? unknown : Promise<ProjectResult> extends CancelablePromise<ProjectResult> ? never : unknown;
declare const c: C;
const probe1: 'x' = c;   // error iff C = unknown; OK iff C = never
const probe2: C = 'x';   // error iff C = never; OK iff C = unknown
