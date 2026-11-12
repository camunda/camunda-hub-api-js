export interface ProjectResult { projectKey: string; name: string; }
export interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
export declare function searchProjects(input: { name?: string }): CancelablePromise<ProjectResult>;
