// Compilable usage examples for file operations.
// These examples are type-checked during build to guard against API regressions.

import { createHubClient, type FileKey, type ProjectKey } from '@camunda8/hub-api';

//#region CreateFile
async function createFileExample(projectKey: ProjectKey, bpmnXml: string) {
  const hub = createHubClient();

  const file = await hub.createFile({
    name: 'Order Process',
    projectKey,
    type: 'bpmn',
    content: bpmnXml,
  });

  console.log(`Created file ${file.fileKey} (revision ${file.revision})`);
}
//#endregion CreateFile

//#region GetFile
async function getFileExample(fileKey: FileKey) {
  const hub = createHubClient();

  const file = await hub.getFile({ fileKey });

  console.log(`${file.name} (${file.type}), revision ${file.revision}`);
}
//#endregion GetFile

//#region UpdateFile
async function updateFileExample(fileKey: FileKey, newXml: string) {
  const hub = createHubClient();

  // Optimistic locking: pass the revision you last read.
  const current = await hub.getFile({ fileKey });
  const updated = await hub.updateFile({
    fileKey,
    content: newXml,
    revision: current.revision,
  });

  console.log(`Now at revision ${updated.revision}`);
}
//#endregion UpdateFile

//#region DeleteFile
async function deleteFileExample(fileKey: FileKey) {
  const hub = createHubClient();

  // Moves the file to the recently-deleted list; see restoreFile.
  await hub.deleteFile({ fileKey });
}
//#endregion DeleteFile

//#region PermanentlyDeleteFile
async function permanentlyDeleteFileExample(fileKey: FileKey) {
  const hub = createHubClient();

  // Irreversible: the file cannot be restored afterwards.
  await hub.permanentlyDeleteFile({ fileKey });
}
//#endregion PermanentlyDeleteFile

//#region PurgeFile
async function purgeFileExample(fileKey: FileKey) {
  const hub = createHubClient();

  await hub.purgeFile({ fileKey });
}
//#endregion PurgeFile

//#region RestoreFile
async function restoreFileExample(fileKey: FileKey) {
  const hub = createHubClient();

  const file = await hub.restoreFile({ fileKey });

  console.log(`Restored: ${file.name}`);
}
//#endregion RestoreFile

//#region SearchFiles
async function searchFilesExample(projectKey: ProjectKey) {
  const hub = createHubClient();

  const result = await hub.searchFiles({
    filter: { projectKey, type: 'bpmn' },
    page: { limit: 50 },
  });

  for (const file of result.items) {
    console.log(`${file.fileKey}: ${file.name}`);
  }
}
//#endregion SearchFiles

//#region SearchRecentlyDeletedFiles
async function searchRecentlyDeletedFilesExample() {
  const hub = createHubClient();

  const result = await hub.searchRecentlyDeletedFiles({ page: { limit: 20 } });

  for (const file of result.items) {
    console.log(`Deleted: ${file.name}`);
  }
}
//#endregion SearchRecentlyDeletedFiles

void createFileExample;
void getFileExample;
void updateFileExample;
void deleteFileExample;
void permanentlyDeleteFileExample;
void purgeFileExample;
void restoreFileExample;
void searchFilesExample;
void searchRecentlyDeletedFilesExample;
