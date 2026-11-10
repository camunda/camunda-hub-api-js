// Compilable usage examples for project snapshot operations.
// These examples are type-checked during build to guard against API regressions.

import {
  createHubClient,
  type ProjectKey,
  type ProjectSnapshotKey,
  type WorkspaceKey,
} from '@camunda8/hub-api';

//#region CreateProjectSnapshot
async function createProjectSnapshotExample(projectKey: ProjectKey) {
  const hub = createHubClient();

  const snapshot = await hub.createProjectSnapshot({
    projectKey,
    name: 'Release 2026.1',
    description: 'Everything shipped in the first release of the year',
  });

  console.log(`Created snapshot: ${snapshot.projectSnapshotKey}`);
}
//#endregion CreateProjectSnapshot

//#region GetProjectSnapshot
async function getProjectSnapshotExample(projectSnapshotKey: ProjectSnapshotKey) {
  const hub = createHubClient();

  const { projectSnapshot, fileVersions } = await hub.getProjectSnapshot({ projectSnapshotKey });

  console.log(`Snapshot ${projectSnapshot.name}: ${fileVersions.length} file versions`);
}
//#endregion GetProjectSnapshot

//#region UpdateProjectSnapshot
async function updateProjectSnapshotExample(projectSnapshotKey: ProjectSnapshotKey) {
  const hub = createHubClient();

  const snapshot = await hub.updateProjectSnapshot({
    projectSnapshotKey,
    description: 'Hotfix included',
  });

  console.log(`Updated: ${snapshot.name}`);
}
//#endregion UpdateProjectSnapshot

//#region DeleteProjectSnapshot
async function deleteProjectSnapshotExample(projectSnapshotKey: ProjectSnapshotKey) {
  const hub = createHubClient();

  await hub.deleteProjectSnapshot({ projectSnapshotKey });
}
//#endregion DeleteProjectSnapshot

//#region RestoreProjectSnapshot
async function restoreProjectSnapshotExample(projectSnapshotKey: ProjectSnapshotKey) {
  const hub = createHubClient();

  await hub.restoreProjectSnapshot({ projectSnapshotKey });
}
//#endregion RestoreProjectSnapshot

//#region DuplicateProjectSnapshot
async function duplicateProjectSnapshotExample(
  projectSnapshotKey: ProjectSnapshotKey,
  targetWorkspaceKey: WorkspaceKey
) {
  const hub = createHubClient();

  const project = await hub.duplicateProjectSnapshot({ projectSnapshotKey, targetWorkspaceKey });

  console.log(project);
}
//#endregion DuplicateProjectSnapshot

//#region RequestProjectSnapshotReview
async function requestProjectSnapshotReviewExample(projectSnapshotKey: ProjectSnapshotKey) {
  const hub = createHubClient();

  const review = await hub.requestProjectSnapshotReview({ projectSnapshotKey });

  console.log(review);
}
//#endregion RequestProjectSnapshotReview

//#region SubmitProjectSnapshotReview
async function submitProjectSnapshotReviewExample(projectSnapshotKey: ProjectSnapshotKey) {
  const hub = createHubClient();

  const review = await hub.submitProjectSnapshotReview({
    projectSnapshotKey,
    status: 'APPROVED',
    comment: 'Looks good to me',
  });

  console.log(review);
}
//#endregion SubmitProjectSnapshotReview

//#region SearchProjectSnapshots
async function searchProjectSnapshotsExample(projectKey: ProjectKey) {
  const hub = createHubClient();

  const result = await hub.searchProjectSnapshots({
    filter: { projectKey },
    sort: [{ field: 'created', order: 'DESC' }],
    page: { limit: 10 },
  });

  for (const snapshot of result.items) {
    console.log(`${snapshot.projectSnapshotKey}: ${snapshot.name}`);
  }
}
//#endregion SearchProjectSnapshots

//#region GetProjectSnapshotExternalResources
async function getProjectSnapshotExternalResourcesExample(projectSnapshotKey: ProjectSnapshotKey) {
  const hub = createHubClient();

  const resources = await hub.getProjectSnapshotExternalResources({ projectSnapshotKey });

  console.log(resources);
}
//#endregion GetProjectSnapshotExternalResources

void createProjectSnapshotExample;
void getProjectSnapshotExample;
void updateProjectSnapshotExample;
void deleteProjectSnapshotExample;
void restoreProjectSnapshotExample;
void duplicateProjectSnapshotExample;
void requestProjectSnapshotReviewExample;
void submitProjectSnapshotReviewExample;
void searchProjectSnapshotsExample;
void getProjectSnapshotExternalResourcesExample;
