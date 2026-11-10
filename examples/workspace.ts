// Compilable usage examples for workspace operations.
// These examples are type-checked during build to guard against API regressions.

import { createHubClient, type WorkspaceKey } from '@camunda8/hub-api';

//#region CreateWorkspace
async function createWorkspaceExample() {
  const hub = createHubClient();

  const workspace = await hub.createWorkspace({
    name: 'Payments',
    description: 'Payment processes and decisions',
  });

  console.log(`Created workspace: ${workspace.workspaceKey}`);
}
//#endregion CreateWorkspace

//#region GetWorkspace
async function getWorkspaceExample(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();

  const { workspace, content } = await hub.getWorkspace({ workspaceKey });

  console.log(`Workspace: ${workspace.name}`, content);
}
//#endregion GetWorkspace

//#region UpdateWorkspace
async function updateWorkspaceExample(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();

  const workspace = await hub.updateWorkspace({ workspaceKey, name: 'Payments (EU)' });

  console.log(`Renamed to: ${workspace.name}`);
}
//#endregion UpdateWorkspace

//#region DeleteWorkspace
async function deleteWorkspaceExample(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();

  // Moves the workspace to the recently-deleted list; see restoreWorkspace.
  await hub.deleteWorkspace({ workspaceKey });
}
//#endregion DeleteWorkspace

//#region PermanentlyDeleteWorkspace
async function permanentlyDeleteWorkspaceExample(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();

  // Irreversible: the workspace cannot be restored afterwards.
  await hub.permanentlyDeleteWorkspace({ workspaceKey });
}
//#endregion PermanentlyDeleteWorkspace

//#region RestoreWorkspace
async function restoreWorkspaceExample(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();

  const workspace = await hub.restoreWorkspace({ workspaceKey });

  console.log(`Restored: ${workspace.name}`);
}
//#endregion RestoreWorkspace

//#region SearchWorkspaces
async function searchWorkspacesExample() {
  const hub = createHubClient();

  const result = await hub.searchWorkspaces({
    filter: { name: { $like: 'Pay*' } },
    sort: [{ field: 'name', order: 'ASC' }],
    page: { from: 0, limit: 20 },
  });

  for (const workspace of result.items) {
    console.log(`${workspace.workspaceKey}: ${workspace.name}`);
  }
}
//#endregion SearchWorkspaces

//#region SearchRecentlyDeletedWorkspaces
async function searchRecentlyDeletedWorkspacesExample() {
  const hub = createHubClient();

  const result = await hub.searchRecentlyDeletedWorkspaces({ page: { limit: 20 } });

  for (const workspace of result.items) {
    console.log(`Deleted: ${workspace.name}`);
  }
}
//#endregion SearchRecentlyDeletedWorkspaces

void createWorkspaceExample;
void getWorkspaceExample;
void updateWorkspaceExample;
void deleteWorkspaceExample;
void permanentlyDeleteWorkspaceExample;
void restoreWorkspaceExample;
void searchWorkspacesExample;
void searchRecentlyDeletedWorkspacesExample;
