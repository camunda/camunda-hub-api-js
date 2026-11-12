declare class HubCore { private readonly secret; configure(): void; }
export interface ProjectCreateRequest { name: string; description?: string; }
export interface ProjectResult { projectKey: string; name: string; }
declare class HubClientBase extends HubCore {
  createProject(input: ProjectCreateRequest): Promise<ProjectResult>;
  getInfo(): Promise<{ version: string }>; searchProjects(input: { name?: string }): CancelablePromise<ProjectResult>;
}
export type HubClient = HubClientBase;
export declare function createHubClient(): HubClient;
export interface CancelablePromise<T> extends Promise<T> { cancel(): void; }
export { HubCore, HubClientBase };
