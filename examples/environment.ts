// Compilable usage examples for environment operations.
// These examples are type-checked during build to guard against API regressions.

import { createHubClient, type ProjectKey, type WorkspaceKey } from '@camunda8/hub-api';

//#region GetEnvironments
async function getEnvironmentsExample() {
  const hub = createHubClient();

  const result = await hub.getEnvironments();

  for (const env of result.items) {
    console.log(`${env.id}: ${env.name} [${env.tags.join(', ')}]`);
  }
}
//#endregion GetEnvironments

//#region GetWorkspaceEnvironments
async function getWorkspaceEnvironmentsExample(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();

  const result = await hub.getWorkspaceEnvironments({ workspaceKey });

  console.log(result.items.map((env) => env.name));
}
//#endregion GetWorkspaceEnvironments

//#region ReplaceWorkspaceEnvironments
async function replaceWorkspaceEnvironmentsExample(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();

  const result = await hub.replaceWorkspaceEnvironments({
    workspaceKey,
    environmentIds: ['dev-cluster', 'prod-cluster'],
  });

  console.log(result.items.map((env) => env.name));
}
//#endregion ReplaceWorkspaceEnvironments

//#region GetProjectEnvironments
async function getProjectEnvironmentsExample(projectKey: ProjectKey) {
  const hub = createHubClient();

  const result = await hub.getProjectEnvironments({ projectKey });

  console.log(result.items.map((env) => env.name));
}
//#endregion GetProjectEnvironments

void getEnvironmentsExample;
void getWorkspaceEnvironmentsExample;
void replaceWorkspaceEnvironmentsExample;
void getProjectEnvironmentsExample;
