// Compilable usage examples for file version operations.
// These examples are type-checked during build to guard against API regressions.

import { createHubClient, type FileKey, type VersionKey } from '@camunda8/hub-api';

//#region CreateVersion
async function createVersionExample(fileKey: FileKey) {
  const hub = createHubClient();

  const version = await hub.createVersion({
    fileKey,
    name: 'v1.0.0',
    description: 'First release',
  });

  console.log(`Created version: ${version.versionKey}`);
}
//#endregion CreateVersion

//#region GetVersion
async function getVersionExample(versionKey: VersionKey) {
  const hub = createHubClient();

  const version = await hub.getVersion({ versionKey });

  console.log(`Version ${version.name} of file ${version.fileKey}`);
}
//#endregion GetVersion

//#region UpdateVersion
async function updateVersionExample(versionKey: VersionKey) {
  const hub = createHubClient();

  const version = await hub.updateVersion({ versionKey, organizationPublic: true });

  console.log(`Published: ${version.organizationPublic}`);
}
//#endregion UpdateVersion

//#region DeleteVersion
async function deleteVersionExample(versionKey: VersionKey) {
  const hub = createHubClient();

  await hub.deleteVersion({ versionKey });
}
//#endregion DeleteVersion

//#region RestoreVersion
async function restoreVersionExample(versionKey: VersionKey) {
  const hub = createHubClient();

  const restored = await hub.restoreVersion({ versionKey });

  console.log(restored);
}
//#endregion RestoreVersion

//#region SearchVersions
async function searchVersionsExample(fileKey: FileKey) {
  const hub = createHubClient();

  // The fileKey filter is required.
  const result = await hub.searchVersions({
    filter: { fileKey },
    sort: [{ field: 'created', order: 'DESC' }],
  });

  for (const version of result.items) {
    console.log(`${version.name}: ${version.description ?? ''}`);
  }
}
//#endregion SearchVersions

void createVersionExample;
void getVersionExample;
void updateVersionExample;
void deleteVersionExample;
void restoreVersionExample;
void searchVersionsExample;
