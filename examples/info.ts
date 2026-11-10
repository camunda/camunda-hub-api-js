// Compilable usage examples for API information.
// These examples are type-checked during build to guard against API regressions.

import { createHubClient } from '@camunda8/hub-api';

//#region GetInfo
async function getInfoExample() {
  const hub = createHubClient();

  const info = await hub.getInfo();

  console.log(`API ${info.version}, organization ${info.authorizedOrganization}`);
}
//#endregion GetInfo

void getInfoExample;
