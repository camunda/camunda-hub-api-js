export interface ProjectResult { projectKey: string; name: string; }
export declare function searchProjects(input: { name?: string }): Promise<ProjectResult>;
