// Compilable usage examples for cluster registration operations.
// These examples are type-checked during build to guard against API regressions.

import { createHubClient } from '@camunda8/hub-api';

//#region CreateClusterRegistration
async function createClusterRegistrationExample() {
  const hub = createHubClient();

  await hub.createClusterRegistration({
    clusterId: 'prod-eu-1',
    clusterName: 'Production EU',
    version: '8.9.0',
    license: { validLicense: true, licenseType: 'production', isCommercial: true },
  });
}
//#endregion CreateClusterRegistration

//#region GetClusterRegistrations
async function getClusterRegistrationsExample() {
  const hub = createHubClient();

  const result = await hub.getClusterRegistrations();

  console.log(result);
}
//#endregion GetClusterRegistrations

//#region RemoveClusterRegistration
async function removeClusterRegistrationExample() {
  const hub = createHubClient();

  await hub.removeClusterRegistration({ clusterId: 'prod-eu-1' });
}
//#endregion RemoveClusterRegistration

//#region GetClusterUsageMetrics
async function getClusterUsageMetricsExample() {
  const hub = createHubClient();

  const end = Date.now();
  const metrics = await hub.getClusterUsageMetrics({
    id: 'prod-eu-1',
    start: end - 30 * 24 * 60 * 60 * 1000, // epoch millis
    end,
  });

  console.log(metrics);
}
//#endregion GetClusterUsageMetrics

void createClusterRegistrationExample;
void getClusterRegistrationsExample;
void removeClusterRegistrationExample;
void getClusterUsageMetricsExample;
