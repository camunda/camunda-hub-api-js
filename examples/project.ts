// Compilable usage examples for project operations.
// These examples are type-checked during build to guard against API regressions.

import { createHubClient, type ProjectKey, type WorkspaceKey } from '@camunda8/hub-api';

//#region CreateProject
async function createProjectExample(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();

  const project = await hub.createProject({ name: 'Order Fulfilment', workspaceKey });

  console.log(`Created project: ${project.projectKey}`);
}
//#endregion CreateProject

//#region GetProject
async function getProjectExample(projectKey: ProjectKey) {
  const hub = createHubClient();

  // Detail results pair the metadata with the project's folders and files.
  const { project, content } = await hub.getProject({ projectKey });

  console.log(`Project ${project.name} in workspace ${project.workspaceKey}`, content);
}
//#endregion GetProject

//#region UpdateProject
async function updateProjectExample(projectKey: ProjectKey, targetWorkspace: WorkspaceKey) {
  const hub = createHubClient();

  const project = await hub.updateProject({
    projectKey,
    name: 'Order Fulfilment v2',
    workspaceKey: targetWorkspace,
  });

  console.log(`Project now in workspace ${project.workspaceKey}`);
}
//#endregion UpdateProject

//#region DeleteProject
async function deleteProjectExample(projectKey: ProjectKey) {
  const hub = createHubClient();

  // Moves the project to the recently-deleted list; see restoreProject.
  await hub.deleteProject({ projectKey });
}
//#endregion DeleteProject

//#region PermanentlyDeleteProject
async function permanentlyDeleteProjectExample(projectKey: ProjectKey) {
  const hub = createHubClient();

  // Irreversible: the project cannot be restored afterwards.
  await hub.permanentlyDeleteProject({ projectKey });
}
//#endregion PermanentlyDeleteProject

//#region RestoreProject
async function restoreProjectExample(projectKey: ProjectKey) {
  const hub = createHubClient();

  const project = await hub.restoreProject({ projectKey });

  console.log(`Restored: ${project.name}`);
}
//#endregion RestoreProject

//#region SearchProjects
async function searchProjectsExample(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();

  const result = await hub.searchProjects({
    filter: { workspaceKey },
    sort: [{ field: 'name', order: 'ASC' }],
    page: { from: 0, limit: 50 },
  });

  console.log(`${result.page.totalItems} projects`);
  for (const project of result.items) {
    console.log(`${project.projectKey}: ${project.name}`);
  }
}
//#endregion SearchProjects

//#region SearchRecentlyDeletedProjects
async function searchRecentlyDeletedProjectsExample() {
  const hub = createHubClient();

  const result = await hub.searchRecentlyDeletedProjects({ page: { limit: 20 } });

  for (const project of result.items) {
    console.log(`Deleted: ${project.name}`);
  }
}
//#endregion SearchRecentlyDeletedProjects

//#region SearchProjectCatalogAssetUsages
async function searchProjectCatalogAssetUsagesExample(projectKey: ProjectKey) {
  const hub = createHubClient();

  const result = await hub.searchProjectCatalogAssetUsages({ projectKey, page: { limit: 20 } });

  for (const usage of result.items) {
    console.log(usage);
  }
}
//#endregion SearchProjectCatalogAssetUsages

void createProjectExample;
void getProjectExample;
void updateProjectExample;
void deleteProjectExample;
void permanentlyDeleteProjectExample;
void restoreProjectExample;
void searchProjectsExample;
void searchRecentlyDeletedProjectsExample;
void searchProjectCatalogAssetUsagesExample;
