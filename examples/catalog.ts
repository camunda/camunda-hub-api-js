// Compilable usage examples for catalog operations.
// These examples are type-checked during build to guard against API regressions.

import { type CatalogAssetKey, createHubClient } from '@camunda8/hub-api';

//#region IngestCatalogAssets
async function ingestCatalogAssetsExample(readmeMarkdown: string, templateJson: string) {
  const hub = createHubClient();

  // multipart/form-data: pass Blobs (or Files); the SDK builds the form body.
  await hub.ingestCatalogAssets({
    readme: [new Blob([readmeMarkdown], { type: 'text/markdown' })],
    template: [new Blob([templateJson], { type: 'application/json' })],
  });
}
//#endregion IngestCatalogAssets

//#region DeleteCatalogAsset
async function deleteCatalogAssetExample(assetKey: CatalogAssetKey) {
  const hub = createHubClient();

  await hub.deleteCatalogAsset({ assetKey });
}
//#endregion DeleteCatalogAsset

//#region SearchCatalogAssets
async function searchCatalogAssetsExample() {
  const hub = createHubClient();

  const result = await hub.searchCatalogAssets({
    filter: { name: { $like: '*Slack*' } },
    page: { limit: 20 },
  });

  for (const asset of result.items) {
    console.log(`${asset.assetKey}: ${asset.name} (${asset.resourceId})`);
  }
}
//#endregion SearchCatalogAssets

//#region SearchCatalogAssetProjectUsages
async function searchCatalogAssetProjectUsagesExample(assetKey: CatalogAssetKey) {
  const hub = createHubClient();

  const result = await hub.searchCatalogAssetProjectUsages({ assetKey, page: { limit: 20 } });

  for (const usage of result.items) {
    console.log(usage);
  }
}
//#endregion SearchCatalogAssetProjectUsages

//#region SearchCatalogAssetFileUsages
async function searchCatalogAssetFileUsagesExample(assetKey: CatalogAssetKey) {
  const hub = createHubClient();

  const result = await hub.searchCatalogAssetFileUsages({ assetKey, page: { limit: 20 } });

  for (const usage of result.items) {
    console.log(usage);
  }
}
//#endregion SearchCatalogAssetFileUsages

void ingestCatalogAssetsExample;
void deleteCatalogAssetExample;
void searchCatalogAssetsExample;
void searchCatalogAssetProjectUsagesExample;
void searchCatalogAssetFileUsagesExample;
