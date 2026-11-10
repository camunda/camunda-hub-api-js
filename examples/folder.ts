// Compilable usage examples for folder operations.
// These examples are type-checked during build to guard against API regressions.

import { createHubClient, type FolderKey, type ProjectKey } from '@camunda8/hub-api';

//#region CreateFolder
async function createFolderExample(projectKey: ProjectKey) {
  const hub = createHubClient();

  const folder = await hub.createFolder({ name: 'Subprocesses', projectKey });

  console.log(`Created folder: ${folder.folderKey}`);
}
//#endregion CreateFolder

//#region GetFolder
async function getFolderExample(folderKey: FolderKey) {
  const hub = createHubClient();

  const { folder, content } = await hub.getFolder({ folderKey });

  console.log(`Folder ${folder.name} in project ${folder.projectKey}`, content);
}
//#endregion GetFolder

//#region UpdateFolder
async function updateFolderExample(folderKey: FolderKey, parentFolderKey: FolderKey) {
  const hub = createHubClient();

  const folder = await hub.updateFolder({ folderKey, parentFolderKey });

  console.log(`Folder ${folder.name} moved`);
}
//#endregion UpdateFolder

//#region DeleteFolder
async function deleteFolderExample(folderKey: FolderKey) {
  const hub = createHubClient();

  // Moves the folder to the recently-deleted list; see restoreFolder.
  await hub.deleteFolder({ folderKey });
}
//#endregion DeleteFolder

//#region PermanentlyDeleteFolder
async function permanentlyDeleteFolderExample(folderKey: FolderKey) {
  const hub = createHubClient();

  // Irreversible: the folder cannot be restored afterwards.
  await hub.permanentlyDeleteFolder({ folderKey });
}
//#endregion PermanentlyDeleteFolder

//#region RestoreFolder
async function restoreFolderExample(folderKey: FolderKey) {
  const hub = createHubClient();

  const folder = await hub.restoreFolder({ folderKey });

  console.log(`Restored: ${folder.name}`);
}
//#endregion RestoreFolder

//#region SearchRecentlyDeletedFolders
async function searchRecentlyDeletedFoldersExample() {
  const hub = createHubClient();

  const result = await hub.searchRecentlyDeletedFolders({ page: { limit: 20 } });

  for (const folder of result.items) {
    console.log(`Deleted: ${folder.name}`);
  }
}
//#endregion SearchRecentlyDeletedFolders

void createFolderExample;
void getFolderExample;
void updateFolderExample;
void deleteFolderExample;
void permanentlyDeleteFolderExample;
void restoreFolderExample;
void searchRecentlyDeletedFoldersExample;
