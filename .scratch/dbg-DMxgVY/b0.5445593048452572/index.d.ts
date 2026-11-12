declare class HubCore { private readonly secret; configure(): void; }
export interface ProjectCreateRequest { name: string; target?: { kind: 'a'; tag?: string } | { kind: 'b'; tag?: string }; }
export interface ProjectResult { projectKey: string; name: string; }
declare class HubClientBase extends HubCore {
  createProject(input: ProjectCreateRequest): Promise<ProjectResult>;
  getInfo(): Promise<{ version: string }>;
}
export type HubClient = HubClientBase;
export declare function createHubClient(): HubClient;
export { HubCore, HubClientBase };
