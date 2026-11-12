
type _A<F> = F extends (...a: any) => infer X ? Awaited<X> : never;
interface ProjectResult { projectKey: string; name?: string; }
declare function f(input: string): Promise<ProjectResult>;
type R = _A<typeof f>;
declare const r: R;
const n = r.name;
