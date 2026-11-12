
interface ProjectResult { projectKey: string; name: string; }
interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
type C2 = Promise<ProjectResult> extends CancelablePromise<ProjectResult> ? never : unknown;
declare const v: C2;
const s: string = v;  // error iff C2 is unknown (never assignable to string too... use different probe)
const u: C2 = 'literal-string';  // error iff C2 is never; OK iff unknown
