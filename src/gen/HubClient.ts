// @generated from HubClient.template.ts - DO NOT EDIT DIRECTLY

import type * as Sdk from '../gen/sdk.gen';
import type { CancelablePromise } from '../runtime/cancelable';
import { HubCore, type HubOptions } from '../runtime/hubCore';
import type { OperationOptions } from '../runtime/retry';
import { installSearchPagination, type WithSearchPagination } from '../runtime/searchPagination';

// === AUTO-GENERATED HUB SUPPORT TYPES START ===
// Generated
// Operations: 66
type _RawReturn<F> = F extends (...a:any)=>Promise<infer R> ? R : never;
type _DataOf<F> = Exclude<_RawReturn<F> extends { data: infer D } ? D : _RawReturn<F>, undefined>;
import * as Ops from './operations.gen';
import type { addMemberInput, createClusterRegistrationInput, createFileInput, createFolderInput, createProjectInput, createProjectSnapshotInput, createVersionInput, createWorkspaceInput, deleteCatalogAssetInput, deleteFileInput, deleteFolderInput, deleteProjectInput, deleteProjectSnapshotInput, deleteVersionInput, deleteWorkspaceInput, duplicateProjectSnapshotInput, getClusterRegistrationsInput, getClusterUsageMetricsInput, getEnvironmentsInput, getFileInput, getFolderInput, getInfoInput, getProjectInput, getProjectEnvironmentsInput, getProjectSnapshotInput, getProjectSnapshotExternalResourcesInput, getVersionInput, getWorkspaceInput, getWorkspaceEnvironmentsInput, ingestCatalogAssetsInput, permanentlyDeleteFileInput, permanentlyDeleteFolderInput, permanentlyDeleteProjectInput, permanentlyDeleteWorkspaceInput, purgeFileInput, removeClusterRegistrationInput, removeMemberInput, replaceWorkspaceEnvironmentsInput, requestProjectSnapshotReviewInput, restoreFileInput, restoreFolderInput, restoreProjectInput, restoreProjectSnapshotInput, restoreVersionInput, restoreWorkspaceInput, searchCatalogAssetFileUsagesInput, searchCatalogAssetProjectUsagesInput, searchCatalogAssetsInput, searchFilesInput, searchMembersInput, searchProjectCatalogAssetUsagesInput, searchProjectsInput, searchProjectSnapshotsInput, searchRecentlyDeletedFilesInput, searchRecentlyDeletedFoldersInput, searchRecentlyDeletedProjectsInput, searchRecentlyDeletedWorkspacesInput, searchVersionsInput, searchWorkspacesInput, submitProjectSnapshotReviewInput, updateFileInput, updateFolderInput, updateProjectInput, updateProjectSnapshotInput, updateVersionInput, updateWorkspaceInput } from './operations.gen';
export type { addMemberInput, createClusterRegistrationInput, createFileInput, createFolderInput, createProjectInput, createProjectSnapshotInput, createVersionInput, createWorkspaceInput, deleteCatalogAssetInput, deleteFileInput, deleteFolderInput, deleteProjectInput, deleteProjectSnapshotInput, deleteVersionInput, deleteWorkspaceInput, duplicateProjectSnapshotInput, getClusterRegistrationsInput, getClusterUsageMetricsInput, getEnvironmentsInput, getFileInput, getFolderInput, getInfoInput, getProjectInput, getProjectEnvironmentsInput, getProjectSnapshotInput, getProjectSnapshotExternalResourcesInput, getVersionInput, getWorkspaceInput, getWorkspaceEnvironmentsInput, ingestCatalogAssetsInput, permanentlyDeleteFileInput, permanentlyDeleteFolderInput, permanentlyDeleteProjectInput, permanentlyDeleteWorkspaceInput, purgeFileInput, removeClusterRegistrationInput, removeMemberInput, replaceWorkspaceEnvironmentsInput, requestProjectSnapshotReviewInput, restoreFileInput, restoreFolderInput, restoreProjectInput, restoreProjectSnapshotInput, restoreVersionInput, restoreWorkspaceInput, searchCatalogAssetFileUsagesInput, searchCatalogAssetProjectUsagesInput, searchCatalogAssetsInput, searchFilesInput, searchMembersInput, searchProjectCatalogAssetUsagesInput, searchProjectsInput, searchProjectSnapshotsInput, searchRecentlyDeletedFilesInput, searchRecentlyDeletedFoldersInput, searchRecentlyDeletedProjectsInput, searchRecentlyDeletedWorkspacesInput, searchVersionsInput, searchWorkspacesInput, submitProjectSnapshotReviewInput, updateFileInput, updateFolderInput, updateProjectInput, updateProjectSnapshotInput, updateVersionInput, updateWorkspaceInput } from './operations.gen';
// === AUTO-GENERATED HUB SUPPORT TYPES END ===

// Cancelable primitive (kept lightweight & local)
export class CancelError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'CancelError';
  }
}
export type { CancelablePromise, HubOptions };

/** Create a {@link HubClient} for the Camunda Hub REST API. */
export function createHubClient(options?: HubOptions): HubClient {
  return new HubClient(options);
}

/**
 * The Hub client's operation methods. Create clients with {@link createHubClient}
 * or {@link HubClient}, which add `.paginate(...)` to every search operation.
 */
export class HubClientBase extends HubCore {
  constructor(opts: HubOptions = {}) {
    // Discriminate the full client from bare `HubCore` (and consumer subclasses of
    // it) for support diagnostics — see `HubOptions.__hubComponent`.
    super({ ...opts, __hubComponent: 'HubClient' });
    // Attach `.paginate` to every search* operation. One well-known wiring point;
    // discovers search methods generically (no per-op list).
    installSearchPagination(this);
  }

  // === AUTO-GENERATED HUB METHODS START ===
  // Generated methods: each delegates to its standalone function in operations.gen.ts
  /**
   * Add or update a member
   *
   * Adds a member to the workspace, or updates the role of an existing member. The member is identified by their email address. If that user has not logged in yet, a workspace invitation is created and an email is sent instead, and the person becomes an actual member once they log in for the first time.
   *
   * @example Add a member to a workspace
   * ```ts
   * async function addMemberExample(workspaceKey: WorkspaceKey) {
   *   const hub = createHubClient();
   * 
   *   // Member emails are client-minted keys: brand them with MemberEmail.assumeExists.
   *   const member = await hub.addMember({
   *     workspaceKey,
   *     email: MemberEmail.assumeExists('alice@example.com'),
   *     role: 'editor',
   *   });
   * 
   *   console.log(`${member.email} is now ${member.role}`);
   * }
   * ```
   * @operationId addMember
   * @tags Member
   */
  addMember(input: addMemberInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.addMember>>;
  addMember(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.addMember(this, arg, options);
  }

  /**
   * Create or update a cluster registration
   *
   * Creates or updates a cluster registration in Camunda Hub via discovery. This does not provision infrastructure — it only creates or updates the cluster registration in Hub. This endpoint requires dynamic cluster management to be enabled. If a cluster with the resolved ID already exists, its registration will be updated.
   *
   * @example Register a cluster
   * ```ts
   * async function createClusterRegistrationExample() {
   *   const hub = createHubClient();
   * 
   *   await hub.createClusterRegistration({
   *     clusterId: 'prod-eu-1',
   *     clusterName: 'Production EU',
   *     version: '8.9.0',
   *     license: { validLicense: true, licenseType: 'production', isCommercial: true },
   *   });
   * }
   * ```
   * @operationId createClusterRegistration
   * @tags Cluster
   */
  createClusterRegistration(input: createClusterRegistrationInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.createClusterRegistration>>;
  createClusterRegistration(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.createClusterRegistration(this, arg, options);
  }

  /**
   * Create a file
   *
   * Creates a new file in the specified project and folder.
   *
   * @example Create a BPMN file
   * ```ts
   * async function createFileExample(projectKey: ProjectKey, bpmnXml: string) {
   *   const hub = createHubClient();
   * 
   *   const file = await hub.createFile({
   *     name: 'Order Process',
   *     projectKey,
   *     type: 'bpmn',
   *     content: bpmnXml,
   *   });
   * 
   *   console.log(`Created file ${file.fileKey} (revision ${file.revision})`);
   * }
   * ```
   * @operationId createFile
   * @tags File
   */
  createFile(input: createFileInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.createFile>>;
  createFile(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.createFile(this, arg, options);
  }

  /**
   * Create a folder
   *
   * Creates a new folder in the specified project and/or parent folder.
   *
   * @example Create a folder in a project
   * ```ts
   * async function createFolderExample(projectKey: ProjectKey) {
   *   const hub = createHubClient();
   * 
   *   const folder = await hub.createFolder({ name: 'Subprocesses', projectKey });
   * 
   *   console.log(`Created folder: ${folder.folderKey}`);
   * }
   * ```
   * @operationId createFolder
   * @tags Folder
   */
  createFolder(input: createFolderInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.createFolder>>;
  createFolder(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.createFolder(this, arg, options);
  }

  /**
   * Create a project
   *
   * Creates a new empty project in the specified workspace.
   *
   * @example Create a project
   * ```ts
   * async function createProjectExample(workspaceKey: WorkspaceKey) {
   *   const hub = createHubClient();
   * 
   *   const project = await hub.createProject({ name: 'Order Fulfilment', workspaceKey });
   * 
   *   console.log(`Created project: ${project.projectKey}`);
   * }
   * ```
   * @operationId createProject
   * @tags Project
   */
  createProject(input: createProjectInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.createProject>>;
  createProject(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.createProject(this, arg, options);
  }

  /**
   * Create a project snapshot
   *
   * Creates a new project snapshot by taking a snapshot of every file currently in the project. Each file contributes one file version to the snapshot, recorded together with the file's name and folder location at that moment.
   *
   * @example Snapshot a project
   * ```ts
   * async function createProjectSnapshotExample(projectKey: ProjectKey) {
   *   const hub = createHubClient();
   * 
   *   const snapshot = await hub.createProjectSnapshot({
   *     projectKey,
   *     name: 'Release 2026.1',
   *     description: 'Everything shipped in the first release of the year',
   *   });
   * 
   *   console.log(`Created snapshot: ${snapshot.projectSnapshotKey}`);
   * }
   * ```
   * @operationId createProjectSnapshot
   * @tags Project Snapshot
   */
  createProjectSnapshot(input: createProjectSnapshotInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.createProjectSnapshot>>;
  createProjectSnapshot(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.createProjectSnapshot(this, arg, options);
  }

  /**
   * Create a version
   *
   * Creates a new version by taking a snapshot of the current content of the specified file.
   *
   * @example Create a version of a file
   * ```ts
   * async function createVersionExample(fileKey: FileKey) {
   *   const hub = createHubClient();
   * 
   *   const version = await hub.createVersion({
   *     fileKey,
   *     name: 'v1.0.0',
   *     description: 'First release',
   *   });
   * 
   *   console.log(`Created version: ${version.versionKey}`);
   * }
   * ```
   * @operationId createVersion
   * @tags Version
   */
  createVersion(input: createVersionInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.createVersion>>;
  createVersion(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.createVersion(this, arg, options);
  }

  /**
   * Create a workspace
   *
   * Creates a new workspace in the caller's organization.
   *
   * @example Create a workspace
   * ```ts
   * async function createWorkspaceExample() {
   *   const hub = createHubClient();
   * 
   *   const workspace = await hub.createWorkspace({
   *     name: 'Payments',
   *     description: 'Payment processes and decisions',
   *   });
   * 
   *   console.log(`Created workspace: ${workspace.workspaceKey}`);
   * }
   * ```
   * @operationId createWorkspace
   * @tags Workspace
   */
  createWorkspace(input: createWorkspaceInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.createWorkspace>>;
  createWorkspace(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.createWorkspace(this, arg, options);
  }

  /**
   * Delete a catalog asset
   *
   * Deletes the catalog asset with the given asset key.
   *
   * @example Delete a catalog asset
   * ```ts
   * async function deleteCatalogAssetExample(assetKey: CatalogAssetKey) {
   *   const hub = createHubClient();
   * 
   *   await hub.deleteCatalogAsset({ assetKey });
   * }
   * ```
   * @operationId deleteCatalogAsset
   * @tags Catalog
   */
  deleteCatalogAsset(input: deleteCatalogAssetInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.deleteCatalogAsset>>;
  deleteCatalogAsset(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.deleteCatalogAsset(this, arg, options);
  }

  /**
   * Delete a file
   *
   * Soft-deletes the file with the given file key. The file is moved to the recently deleted state and can be recovered until the retention period expires and the scheduled cleanup job runs. To permanently and irreversibly remove a file, use `DELETE /files/{fileKey}/permanent` instead.
   *
   * @example Delete a file (recoverable)
   * ```ts
   * async function deleteFileExample(fileKey: FileKey) {
   *   const hub = createHubClient();
   * 
   *   // Moves the file to the recently-deleted list; see restoreFile.
   *   await hub.deleteFile({ fileKey });
   * }
   * ```
   * @operationId deleteFile
   * @tags File
   */
  deleteFile(input: deleteFileInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.deleteFile>>;
  deleteFile(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.deleteFile(this, arg, options);
  }

  /**
   * Delete a folder
   *
   * Soft-deletes the folder with the given folder key, cascading to all of its descendants. The folder is moved to the recently deleted state and can be recovered during the retention window. To permanently and irreversibly remove a folder, use `DELETE /folders/{folderKey}/permanent` instead.
   *
   * @example Delete a folder (recoverable)
   * ```ts
   * async function deleteFolderExample(folderKey: FolderKey) {
   *   const hub = createHubClient();
   * 
   *   // Moves the folder to the recently-deleted list; see restoreFolder.
   *   await hub.deleteFolder({ folderKey });
   * }
   * ```
   * @operationId deleteFolder
   * @tags Folder
   */
  deleteFolder(input: deleteFolderInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.deleteFolder>>;
  deleteFolder(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.deleteFolder(this, arg, options);
  }

  /**
   * Delete a project
   *
   * Soft-deletes the project with the given project key, cascading to all of its descendant folders and files. The project is moved to the recently deleted state and can be recovered during the retention window. To permanently and irreversibly remove a project, use `DELETE /projects/{projectKey}/permanent` instead.
   *
   * @example Delete a project (recoverable)
   * ```ts
   * async function deleteProjectExample(projectKey: ProjectKey) {
   *   const hub = createHubClient();
   * 
   *   // Moves the project to the recently-deleted list; see restoreProject.
   *   await hub.deleteProject({ projectKey });
   * }
   * ```
   * @operationId deleteProject
   * @tags Project
   */
  deleteProject(input: deleteProjectInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.deleteProject>>;
  deleteProject(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.deleteProject(this, arg, options);
  }

  /**
   * Delete a project snapshot
   *
   * Deletes the specified project snapshot. The file versions it captured are not deleted, because they can be shared with other project snapshots.
   *
   * Deleting a project snapshot that captured a file version published to shared resources requires elevated organization access and is rejected with `403` otherwise. On SaaS, public API clients never hold elevated organization access, so deleting a snapshot that captured such a file version always fails with `403` in that case.
   *
   * @example Delete a project snapshot
   * ```ts
   * async function deleteProjectSnapshotExample(projectSnapshotKey: ProjectSnapshotKey) {
   *   const hub = createHubClient();
   * 
   *   await hub.deleteProjectSnapshot({ projectSnapshotKey });
   * }
   * ```
   * @operationId deleteProjectSnapshot
   * @tags Project Snapshot
   */
  deleteProjectSnapshot(input: deleteProjectSnapshotInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.deleteProjectSnapshot>>;
  deleteProjectSnapshot(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.deleteProjectSnapshot(this, arg, options);
  }

  /**
   * Delete a version
   *
   * Deletes the specified version.
   *
   * @example Delete a version
   * ```ts
   * async function deleteVersionExample(versionKey: VersionKey) {
   *   const hub = createHubClient();
   * 
   *   await hub.deleteVersion({ versionKey });
   * }
   * ```
   * @operationId deleteVersion
   * @tags Version
   */
  deleteVersion(input: deleteVersionInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.deleteVersion>>;
  deleteVersion(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.deleteVersion(this, arg, options);
  }

  /**
   * Delete a workspace
   *
   * Soft-deletes the workspace with the given key, cascading to all of its projects, folders, files, and IDP applications. The workspace is moved to the recently deleted state and can be recovered during the retention window. To permanently and irreversibly remove a workspace, use `DELETE /workspaces/{workspaceKey}/permanent` instead.
   *
   * @example Delete a workspace (recoverable)
   * ```ts
   * async function deleteWorkspaceExample(workspaceKey: WorkspaceKey) {
   *   const hub = createHubClient();
   * 
   *   // Moves the workspace to the recently-deleted list; see restoreWorkspace.
   *   await hub.deleteWorkspace({ workspaceKey });
   * }
   * ```
   * @operationId deleteWorkspace
   * @tags Workspace
   */
  deleteWorkspace(input: deleteWorkspaceInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.deleteWorkspace>>;
  deleteWorkspace(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.deleteWorkspace(this, arg, options);
  }

  /**
   * Duplicate a project snapshot
   *
   * Creates a new project in the target workspace from this project snapshot. The new project takes the current name of the snapshot's project, with a copy suffix appended if a project of that name already exists in the target workspace. If appending the suffix would exceed the maximum project name length, the base name is truncated first.
   * The duplicate is created with one project snapshot of its own, carrying the source snapshot's name and description. The source project snapshot is left unchanged.
   *
   * @example Duplicate a snapshot into another workspace
   * ```ts
   * async function duplicateProjectSnapshotExample(
   *   projectSnapshotKey: ProjectSnapshotKey,
   *   targetWorkspaceKey: WorkspaceKey
   * ) {
   *   const hub = createHubClient();
   * 
   *   const project = await hub.duplicateProjectSnapshot({ projectSnapshotKey, targetWorkspaceKey });
   * 
   *   console.log(project);
   * }
   * ```
   * @operationId duplicateProjectSnapshot
   * @tags Project Snapshot
   */
  duplicateProjectSnapshot(input: duplicateProjectSnapshotInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.duplicateProjectSnapshot>>;
  duplicateProjectSnapshot(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.duplicateProjectSnapshot(this, arg, options);
  }

  /**
   * Get all cluster registrations
   *
   * Returns all cluster registrations.
   *
   * @example List registered clusters
   * ```ts
   * async function getClusterRegistrationsExample() {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.getClusterRegistrations();
   * 
   *   console.log(result);
   * }
   * ```
   * @operationId getClusterRegistrations
   * @tags Cluster
   */
  getClusterRegistrations(options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.getClusterRegistrations>>;
  getClusterRegistrations(options?: OperationOptions): CancelablePromise<any> {
    return Ops.getClusterRegistrations(this, options);
  }

  /**
   * Get cluster usage metrics
   *
   * Returns the usage metrics for a cluster. The provided token is forwarded to the Orchestration Cluster API of the target cluster, so it must additionally include the read:* permission for the orchestration-api audience.
   *
   * @example Get usage metrics for a cluster
   * ```ts
   * async function getClusterUsageMetricsExample() {
   *   const hub = createHubClient();
   * 
   *   const end = Date.now();
   *   const metrics = await hub.getClusterUsageMetrics({
   *     id: 'prod-eu-1',
   *     start: end - 30 * 24 * 60 * 60 * 1000, // epoch millis
   *     end,
   *   });
   * 
   *   console.log(metrics);
   * }
   * ```
   * @operationId getClusterUsageMetrics
   * @tags Cluster
   */
  getClusterUsageMetrics(input: getClusterUsageMetricsInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.getClusterUsageMetrics>>;
  getClusterUsageMetrics(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.getClusterUsageMetrics(this, arg, options);
  }

  /**
   * Get all environments
   *
   * Returns all environments available in the organization. The organization is derived from the access token.
   *
   * On SaaS, the environments are resolved from Console using the caller's own token; a token that is not authorized for Console's `cluster:read` permission is rejected with `403`. Self-Managed has no such requirement — it does not call Console — so this `cluster:read` `403` never applies there.
   *
   * @example List all environments
   * ```ts
   * async function getEnvironmentsExample() {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.getEnvironments();
   * 
   *   for (const env of result.items) {
   *     console.log(`${env.id}: ${env.name} [${env.tags.join(', ')}]`);
   *   }
   * }
   * ```
   * @operationId getEnvironments
   * @tags Environment
   */
  getEnvironments(options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.getEnvironments>>;
  getEnvironments(options?: OperationOptions): CancelablePromise<any> {
    return Ops.getEnvironments(this, options);
  }

  /**
   * Get a file
   *
   * Returns the file metadata and content for the given file key.
   *
   * @example Get a file with its content
   * ```ts
   * async function getFileExample(fileKey: FileKey) {
   *   const hub = createHubClient();
   * 
   *   const file = await hub.getFile({ fileKey });
   * 
   *   console.log(`${file.name} (${file.type}), revision ${file.revision}`);
   * }
   * ```
   * @operationId getFile
   * @tags File
   */
  getFile(input: getFileInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.getFile>>;
  getFile(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.getFile(this, arg, options);
  }

  /**
   * Get a folder
   *
   * Returns the folder metadata and its content (child folders and files).
   *
   * @example Get a folder
   * ```ts
   * async function getFolderExample(folderKey: FolderKey) {
   *   const hub = createHubClient();
   * 
   *   const { folder, content } = await hub.getFolder({ folderKey });
   * 
   *   console.log(`Folder ${folder.name} in project ${folder.projectKey}`, content);
   * }
   * ```
   * @operationId getFolder
   * @tags Folder
   */
  getFolder(input: getFolderInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.getFolder>>;
  getFolder(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.getFolder(this, arg, options);
  }

  /**
   * Get API info
   *
   * Returns metadata about the V2 API, including the API version and the organization authorized by the caller's credentials.
   *
   * @example Get API information
   * ```ts
   * async function getInfoExample() {
   *   const hub = createHubClient();
   * 
   *   const info = await hub.getInfo();
   * 
   *   console.log(`API ${info.version}, organization ${info.authorizedOrganization}`);
   * }
   * ```
   * @operationId getInfo
   * @tags Info
   */
  getInfo(options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.getInfo>>;
  getInfo(options?: OperationOptions): CancelablePromise<any> {
    return Ops.getInfo(this, options);
  }

  /**
   * Get a project
   *
   * Returns the project metadata and its content (child folders and files).
   *
   * @example Get a project
   * ```ts
   * async function getProjectExample(projectKey: ProjectKey) {
   *   const hub = createHubClient();
   * 
   *   // Detail results pair the metadata with the project's folders and files.
   *   const { project, content } = await hub.getProject({ projectKey });
   * 
   *   console.log(`Project ${project.name} in workspace ${project.workspaceKey}`, content);
   * }
   * ```
   * @operationId getProject
   * @tags Project
   */
  getProject(input: getProjectInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.getProject>>;
  getProject(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.getProject(this, arg, options);
  }

  /**
   * Get a project's available environments
   *
   * Returns the environments available to the given project, which is the full set assigned to its parent workspace.
   *
   * @example List the environments of a project
   * ```ts
   * async function getProjectEnvironmentsExample(projectKey: ProjectKey) {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.getProjectEnvironments({ projectKey });
   * 
   *   console.log(result.items.map((env) => env.name));
   * }
   * ```
   * @operationId getProjectEnvironments
   * @tags Environment
   */
  getProjectEnvironments(input: getProjectEnvironmentsInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.getProjectEnvironments>>;
  getProjectEnvironments(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.getProjectEnvironments(this, arg, options);
  }

  /**
   * Get a project snapshot
   *
   * Returns the project snapshot metadata together with the file versions it captured. Each file version carries the content hash and the file name and folder location recorded at snapshot time. To compare two project snapshots, request both and match their file versions on `fileKey` to find the same file across both snapshots, then compare `contentHash` to detect changes.
   *
   * @example Get a project snapshot
   * ```ts
   * async function getProjectSnapshotExample(projectSnapshotKey: ProjectSnapshotKey) {
   *   const hub = createHubClient();
   * 
   *   const { projectSnapshot, fileVersions } = await hub.getProjectSnapshot({ projectSnapshotKey });
   * 
   *   console.log(`Snapshot ${projectSnapshot.name}: ${fileVersions.length} file versions`);
   * }
   * ```
   * @operationId getProjectSnapshot
   * @tags Project Snapshot
   */
  getProjectSnapshot(input: getProjectSnapshotInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.getProjectSnapshot>>;
  getProjectSnapshot(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.getProjectSnapshot(this, arg, options);
  }

  /**
   * Check whether a project snapshot references external resources
   *
   * Reports whether this project snapshot references resources that live outside the snapshot itself: forms, call activities, business rule tasks, and RPA resources. `false` for each flag means the snapshot does not reference anything of that kind outside itself.
   *
   * @example List the external resources a snapshot references
   * ```ts
   * async function getProjectSnapshotExternalResourcesExample(projectSnapshotKey: ProjectSnapshotKey) {
   *   const hub = createHubClient();
   * 
   *   const resources = await hub.getProjectSnapshotExternalResources({ projectSnapshotKey });
   * 
   *   console.log(resources);
   * }
   * ```
   * @operationId getProjectSnapshotExternalResources
   * @tags Project Snapshot
   */
  getProjectSnapshotExternalResources(input: getProjectSnapshotExternalResourcesInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.getProjectSnapshotExternalResources>>;
  getProjectSnapshotExternalResources(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.getProjectSnapshotExternalResources(this, arg, options);
  }

  /**
   * Get a version
   *
   * Returns the version metadata and the file content at that version.
   *
   * @example Get a version
   * ```ts
   * async function getVersionExample(versionKey: VersionKey) {
   *   const hub = createHubClient();
   * 
   *   const version = await hub.getVersion({ versionKey });
   * 
   *   console.log(`Version ${version.name} of file ${version.fileKey}`);
   * }
   * ```
   * @operationId getVersion
   * @tags Version
   */
  getVersion(input: getVersionInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.getVersion>>;
  getVersion(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.getVersion(this, arg, options);
  }

  /**
   * Get a workspace
   *
   * Returns the workspace metadata and its contained projects.
   *
   * @example Get a workspace
   * ```ts
   * async function getWorkspaceExample(workspaceKey: WorkspaceKey) {
   *   const hub = createHubClient();
   * 
   *   const { workspace, content } = await hub.getWorkspace({ workspaceKey });
   * 
   *   console.log(`Workspace: ${workspace.name}`, content);
   * }
   * ```
   * @operationId getWorkspace
   * @tags Workspace
   */
  getWorkspace(input: getWorkspaceInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.getWorkspace>>;
  getWorkspace(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.getWorkspace(this, arg, options);
  }

  /**
   * Get a workspace's assigned environments
   *
   * Returns the environments assigned to the given workspace.
   *
   * @example List the environments of a workspace
   * ```ts
   * async function getWorkspaceEnvironmentsExample(workspaceKey: WorkspaceKey) {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.getWorkspaceEnvironments({ workspaceKey });
   * 
   *   console.log(result.items.map((env) => env.name));
   * }
   * ```
   * @operationId getWorkspaceEnvironments
   * @tags Environment
   */
  getWorkspaceEnvironments(input: getWorkspaceEnvironmentsInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.getWorkspaceEnvironments>>;
  getWorkspaceEnvironments(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.getWorkspaceEnvironments(this, arg, options);
  }

  /**
   * Ingest catalog assets
   *
   * Ingests the full set of catalog assets.
   *
   * For each asset, the actual element template JSON file as well as an accompanying README file must be provided.
   * The README should provide a description of the asset and can use Markdown syntax. It must contain a YAML
   * frontmatter section with a `template` field that references the element template by its file name. Optionally,
   * the frontmatter can specify a `category` and a list of `tags` that can be used to search and filter assets in
   * the catalog.
   *
   * ```
   * ---
   * template: banking-system-connector.json
   * category: Finance
   * tags:
   * - invoice
   * - payment
   * - transaction
   * ---
   * ## Description
   * ...
   *
   * ## Usage
   * ...
   * ```
   *
   * The files must be provided as `multipart/form-data` with the named parts `readme` and `template` (the part name
   * is the same for each file of the respective type).
   *
   * The optional `source` form field identifies the catalog source the assets are ingested from. Only assets of
   * the ingested source are unpublished when they are missing from the payload; assets of other sources stay
   * untouched. If a submitted element template ID already exists in a different source, the asset is adopted:
   * its source is updated to the ingested source and it is (re)published there. This is the hand-over path when
   * a source is renamed or a mono-repo is split into multiple repositories — the last successful ingestion
   * wins. Requests without a `source` match the default bucket of assets that were ingested without a source.
   *
   * Previously ingested assets of the ingested source that are not included in the request payload will be
   * marked as unpublished in the catalog. Unpublished assets are only accessible to administrators; regular
   * modeling users cannot use them for new diagram elements anymore. Existing diagrams using assets that get
   * unpublished will continue to work as before.
   *
   * Re-ingesting an unpublished asset with an unchanged template at its latest version does not require a
   * version bump: the stored content is updated from the submission, including its deprecation flag.
   * Deprecation is lifecycle metadata that follows the latest ingestion while an asset is unpublished.
   * Changing a published asset — including only its deprecation flag — requires a higher template version.
   *
   * @example Ingest a catalog asset
   * ```ts
   * async function ingestCatalogAssetsExample(readmeMarkdown: string, templateJson: string) {
   *   const hub = createHubClient();
   * 
   *   // multipart/form-data: pass Blobs (or Files); the SDK builds the form body.
   *   await hub.ingestCatalogAssets({
   *     readme: [new Blob([readmeMarkdown], { type: 'text/markdown' })],
   *     template: [new Blob([templateJson], { type: 'application/json' })],
   *   });
   * }
   * ```
   * @operationId ingestCatalogAssets
   * @tags Catalog
   */
  ingestCatalogAssets(input: ingestCatalogAssetsInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.ingestCatalogAssets>>;
  ingestCatalogAssets(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.ingestCatalogAssets(this, arg, options);
  }

  /**
   * Permanently delete a file
   *
   * Permanently and irreversibly removes the file with the given file key. Process application snapshot references to the file are detached so snapshot data is preserved. The file cannot be recovered afterwards. This works in one step and does not require the file to be soft-deleted first.
   *
   * @example Permanently delete a file
   * ```ts
   * async function permanentlyDeleteFileExample(fileKey: FileKey) {
   *   const hub = createHubClient();
   * 
   *   // Irreversible: the file cannot be restored afterwards.
   *   await hub.permanentlyDeleteFile({ fileKey });
   * }
   * ```
   * @operationId permanentlyDeleteFile
   * @tags File
   */
  permanentlyDeleteFile(input: permanentlyDeleteFileInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.permanentlyDeleteFile>>;
  permanentlyDeleteFile(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.permanentlyDeleteFile(this, arg, options);
  }

  /**
   * Permanently delete a folder
   *
   * Permanently and irreversibly removes the folder with the given folder key. The folder cannot be recovered afterwards. If the folder is live (not soft-deleted), then it must not contain any live files anywhere in its subtree. Empty live folders are removed as part of the deletion as well as any soft-deleted items in its subtree. If the folder is soft-deleted and has been the target of the operation, then it is deleted with any soft-deleted folders or files it contains. If the folder is soft-deleted but has not been the target of the operation (i.e. one of its ancestor folders/project/workspace was soft-deleted), then the operation fails with 409. Instead, delete the original target of the soft-delete operation.
   *
   * @example Permanently delete a folder
   * ```ts
   * async function permanentlyDeleteFolderExample(folderKey: FolderKey) {
   *   const hub = createHubClient();
   * 
   *   // Irreversible: the folder cannot be restored afterwards.
   *   await hub.permanentlyDeleteFolder({ folderKey });
   * }
   * ```
   * @operationId permanentlyDeleteFolder
   * @tags Folder
   */
  permanentlyDeleteFolder(input: permanentlyDeleteFolderInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.permanentlyDeleteFolder>>;
  permanentlyDeleteFolder(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.permanentlyDeleteFolder(this, arg, options);
  }

  /**
   * Permanently delete a project
   *
   * Permanently and irreversibly removes the project with the given project key. The project cannot be recovered afterwards. Empty folders and version history are removed as part of the deletion. If the project is live (not soft-deleted), then it must not contain any live files anywhere in its subtree. Empty live folders are removed as part of the deletion as well as any soft-deleted items in its subtree. If the project is soft-deleted and has been the target of the operation, then it is deleted with any soft-deleted folders or files it contains. If the project is soft-deleted but has not been the target of the operation (i.e. its ancestor workspace was soft-deleted), then the operation fails with 409. Instead, delete the original target of the soft-delete operation.
   *
   * @example Permanently delete a project
   * ```ts
   * async function permanentlyDeleteProjectExample(projectKey: ProjectKey) {
   *   const hub = createHubClient();
   * 
   *   // Irreversible: the project cannot be restored afterwards.
   *   await hub.permanentlyDeleteProject({ projectKey });
   * }
   * ```
   * @operationId permanentlyDeleteProject
   * @tags Project
   */
  permanentlyDeleteProject(input: permanentlyDeleteProjectInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.permanentlyDeleteProject>>;
  permanentlyDeleteProject(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.permanentlyDeleteProject(this, arg, options);
  }

  /**
   * Permanently delete a workspace
   *
   * Permanently and irreversibly removes the workspace with the given key. The workspace cannot be recovered afterwards. If the workspace is already soft-deleted, it is removed along with all of its projects, folders, files, process applications, and IDP applications regardless of their contents; otherwise it must have no live files, process applications, or IDP applications, and any soft-deleted items in its subtree are removed as part of the deletion. This works in one step and does not require the workspace to be soft-deleted first.
   *
   * @example Permanently delete a workspace
   * ```ts
   * async function permanentlyDeleteWorkspaceExample(workspaceKey: WorkspaceKey) {
   *   const hub = createHubClient();
   * 
   *   // Irreversible: the workspace cannot be restored afterwards.
   *   await hub.permanentlyDeleteWorkspace({ workspaceKey });
   * }
   * ```
   * @operationId permanentlyDeleteWorkspace
   * @tags Workspace
   */
  permanentlyDeleteWorkspace(input: permanentlyDeleteWorkspaceInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.permanentlyDeleteWorkspace>>;
  permanentlyDeleteWorkspace(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.permanentlyDeleteWorkspace(this, arg, options);
  }

  /**
   * Purge a file from all version history
   *
   * Permanently and irrecoverably removes the file and all references to it across every process application version snapshot. Works on live and soft-deleted files. If the file row has already been permanently deleted, purge still removes any orphaned process application snapshot milestone references that point to the file by ID. Idempotent for files that never existed or have already been fully purged within the caller's organization.
   *
   * @example Purge a file
   * ```ts
   * async function purgeFileExample(fileKey: FileKey) {
   *   const hub = createHubClient();
   * 
   *   await hub.purgeFile({ fileKey });
   * }
   * ```
   * @operationId purgeFile
   * @tags File
   */
  purgeFile(input: purgeFileInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.purgeFile>>;
  purgeFile(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.purgeFile(this, arg, options);
  }

  /**
   * Remove a cluster registration
   *
   * Removes a cluster registration from Camunda Hub. This does not delete or deprovision the actual cluster infrastructure — it only removes the cluster registration from Hub. This endpoint requires dynamic cluster management to be enabled.
   *
   * @example Remove a cluster registration
   * ```ts
   * async function removeClusterRegistrationExample() {
   *   const hub = createHubClient();
   * 
   *   await hub.removeClusterRegistration({ clusterId: 'prod-eu-1' });
   * }
   * ```
   * @operationId removeClusterRegistration
   * @tags Cluster
   */
  removeClusterRegistration(input: removeClusterRegistrationInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.removeClusterRegistration>>;
  removeClusterRegistration(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.removeClusterRegistration(this, arg, options);
  }

  /**
   * Remove a member
   *
   * Removes a member from the workspace.
   *
   * @example Remove a member from a workspace
   * ```ts
   * async function removeMemberExample(workspaceKey: WorkspaceKey, email: MemberEmail) {
   *   const hub = createHubClient();
   * 
   *   await hub.removeMember({ workspaceKey, email });
   * }
   * ```
   * @operationId removeMember
   * @tags Member
   */
  removeMember(input: removeMemberInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.removeMember>>;
  removeMember(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.removeMember(this, arg, options);
  }

  /**
   * Replace a workspace's assigned environments
   *
   * Replaces the full set of environments assigned to the given workspace with the provided set. The request body is the exact set the workspace should end up assigned to: environments not listed are unassigned, and unassigning removes an environment from every project's selection in the workspace. Requires the `update` permission for the organization.
   *
   * @example Replace the environments of a workspace
   * ```ts
   * async function replaceWorkspaceEnvironmentsExample(workspaceKey: WorkspaceKey) {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.replaceWorkspaceEnvironments({
   *     workspaceKey,
   *     environmentIds: ['dev-cluster', 'prod-cluster'],
   *   });
   * 
   *   console.log(result.items.map((env) => env.name));
   * }
   * ```
   * @operationId replaceWorkspaceEnvironments
   * @tags Environment
   */
  replaceWorkspaceEnvironments(input: replaceWorkspaceEnvironmentsInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.replaceWorkspaceEnvironments>>;
  replaceWorkspaceEnvironments(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.replaceWorkspaceEnvironments(this, arg, options);
  }

  /**
   * Request a review of a project snapshot
   *
   * Marks the project snapshot as awaiting review and returns the created review request. A snapshot has at most one review request: requesting a review for a snapshot that already has one is rejected with `409`, even after that request has been reviewed. A reviewed snapshot can therefore never be re-requested; create a new snapshot to start another review round. Creating a request also supersedes any pending request on a different snapshot of the same project, so a project has at most one snapshot awaiting review at a time.
   * Requesting a review adds a system-authored comment to the project's BPMN files.
   *
   * @example Request a review of a snapshot
   * ```ts
   * async function requestProjectSnapshotReviewExample(projectSnapshotKey: ProjectSnapshotKey) {
   *   const hub = createHubClient();
   * 
   *   const review = await hub.requestProjectSnapshotReview({ projectSnapshotKey });
   * 
   *   console.log(review);
   * }
   * ```
   * @operationId requestProjectSnapshotReview
   * @tags Project Snapshot
   */
  requestProjectSnapshotReview(input: requestProjectSnapshotReviewInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.requestProjectSnapshotReview>>;
  requestProjectSnapshotReview(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.requestProjectSnapshotReview(this, arg, options);
  }

  /**
   * Restore a recently deleted file
   *
   * Restores a soft-deleted file back to the live project. If the file's original parent folder was also deleted, the file is restored into a new wrapper folder at the project root. The file cannot be restored if its containing project has been deleted. Only a file that is the root of its own deletion can be restored via this endpoint; a file that was soft-deleted as part of an ancestor folder, project, or workspace's deletion event must be restored through the corresponding ancestor restoration endpoint instead.
   *
   * @example Restore a deleted file
   * ```ts
   * async function restoreFileExample(fileKey: FileKey) {
   *   const hub = createHubClient();
   * 
   *   const file = await hub.restoreFile({ fileKey });
   * 
   *   console.log(`Restored: ${file.name}`);
   * }
   * ```
   * @operationId restoreFile
   * @tags File
   */
  restoreFile(input: restoreFileInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.restoreFile>>;
  restoreFile(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.restoreFile(this, arg, options);
  }

  /**
   * Restore a recently deleted folder
   *
   * Restores a soft-deleted folder back to the live project, together with the descendants that were soft-deleted with it. If the folder's original parent folder was also deleted, the folder is restored into a new wrapper folder under the nearest surviving ancestor folder, or at the project root if no ancestor folder survives. The folder cannot be restored while its containing project or workspace is still deleted. Only a folder that is the root of its own deletion can be restored via this endpoint; a folder that was soft-deleted as part of an ancestor folder, project, or workspace's deletion event must be restored through the corresponding ancestor restoration endpoint instead.
   *
   * @example Restore a deleted folder
   * ```ts
   * async function restoreFolderExample(folderKey: FolderKey) {
   *   const hub = createHubClient();
   * 
   *   const folder = await hub.restoreFolder({ folderKey });
   * 
   *   console.log(`Restored: ${folder.name}`);
   * }
   * ```
   * @operationId restoreFolder
   * @tags Folder
   */
  restoreFolder(input: restoreFolderInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.restoreFolder>>;
  restoreFolder(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.restoreFolder(this, arg, options);
  }

  /**
   * Restore a recently deleted project
   *
   * Restores a soft-deleted project back to the live workspace, together with everything that was soft-deleted as part of the same deletion event. The project cannot be restored while its workspace is still deleted. Only a project that is the root of its own deletion can be restored via this endpoint; a project that was soft-deleted as part of its workspace's deletion event must be restored through the workspace restoration endpoint instead.
   *
   * @example Restore a deleted project
   * ```ts
   * async function restoreProjectExample(projectKey: ProjectKey) {
   *   const hub = createHubClient();
   * 
   *   const project = await hub.restoreProject({ projectKey });
   * 
   *   console.log(`Restored: ${project.name}`);
   * }
   * ```
   * @operationId restoreProject
   * @tags Project
   */
  restoreProject(input: restoreProjectInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.restoreProject>>;
  restoreProject(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.restoreProject(this, arg, options);
  }

  /**
   * Restore a project snapshot
   *
   * Restores the project to the state captured in this project snapshot: file contents, names and folder locations are all reset to the snapshot, files added since are removed, and files deleted since are recreated.
   * Before anything is replaced, the project's current state is preserved as a new, automatically named project snapshot, unless the project has not changed since its most recent project snapshot. The restored-to project snapshot itself is left unchanged, so it can be restored again later.
   *
   * @example Restore a project to a snapshot
   * ```ts
   * async function restoreProjectSnapshotExample(projectSnapshotKey: ProjectSnapshotKey) {
   *   const hub = createHubClient();
   * 
   *   await hub.restoreProjectSnapshot({ projectSnapshotKey });
   * }
   * ```
   * @operationId restoreProjectSnapshot
   * @tags Project Snapshot
   */
  restoreProjectSnapshot(input: restoreProjectSnapshotInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.restoreProjectSnapshot>>;
  restoreProjectSnapshot(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.restoreProjectSnapshot(this, arg, options);
  }

  /**
   * Restore a version
   *
   * Restores the file content to the state captured in this version. A new version is created representing the restored state, unless both the file's live content and its most recent version already match that exact content, in which case that version is returned and nothing is created. For element template files, the request body must include the target version number and a new version is always created.
   *
   * @example Restore a file to a version
   * ```ts
   * async function restoreVersionExample(versionKey: VersionKey) {
   *   const hub = createHubClient();
   * 
   *   const restored = await hub.restoreVersion({ versionKey });
   * 
   *   console.log(restored);
   * }
   * ```
   * @operationId restoreVersion
   * @tags Version
   */
  restoreVersion(input: restoreVersionInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.restoreVersion>>;
  restoreVersion(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.restoreVersion(this, arg, options);
  }

  /**
   * Restore a recently deleted workspace
   *
   * Restores a soft-deleted workspace, together with everything that was soft-deleted as part of the same deletion event.
   *
   * @example Restore a deleted workspace
   * ```ts
   * async function restoreWorkspaceExample(workspaceKey: WorkspaceKey) {
   *   const hub = createHubClient();
   * 
   *   const workspace = await hub.restoreWorkspace({ workspaceKey });
   * 
   *   console.log(`Restored: ${workspace.name}`);
   * }
   * ```
   * @operationId restoreWorkspace
   * @tags Workspace
   */
  restoreWorkspace(input: restoreWorkspaceInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.restoreWorkspace>>;
  restoreWorkspace(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.restoreWorkspace(this, arg, options);
  }

  /**
   * Search the files using a catalog asset
   *
   * Returns the files that use the catalog asset with the given asset key, matching the given search criteria.
   *
   * @example Search the files that use a catalog asset
   * ```ts
   * async function searchCatalogAssetFileUsagesExample(assetKey: CatalogAssetKey) {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.searchCatalogAssetFileUsages({ assetKey, page: { limit: 20 } });
   * 
   *   for (const usage of result.items) {
   *     console.log(usage);
   *   }
   * }
   * ```
   * @operationId searchCatalogAssetFileUsages
   * @tags Catalog
   */
  searchCatalogAssetFileUsages(input: searchCatalogAssetFileUsagesInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchCatalogAssetFileUsages>>;
  searchCatalogAssetFileUsages(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchCatalogAssetFileUsages(this, arg, options);
  }

  /**
   * Search the projects using a catalog asset
   *
   * Returns the projects that use the catalog asset with the given asset key, matching the given search criteria.
   *
   * @example Search the projects that use a catalog asset
   * ```ts
   * async function searchCatalogAssetProjectUsagesExample(assetKey: CatalogAssetKey) {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.searchCatalogAssetProjectUsages({ assetKey, page: { limit: 20 } });
   * 
   *   for (const usage of result.items) {
   *     console.log(usage);
   *   }
   * }
   * ```
   * @operationId searchCatalogAssetProjectUsages
   * @tags Catalog
   */
  searchCatalogAssetProjectUsages(input: searchCatalogAssetProjectUsagesInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchCatalogAssetProjectUsages>>;
  searchCatalogAssetProjectUsages(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchCatalogAssetProjectUsages(this, arg, options);
  }

  /**
   * Search catalog assets
   *
   * Returns catalog assets matching the given search criteria.
   *
   * @example Search catalog assets
   * ```ts
   * async function searchCatalogAssetsExample() {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.searchCatalogAssets({
   *     filter: { name: { $like: '*Slack*' } },
   *     page: { limit: 20 },
   *   });
   * 
   *   for (const asset of result.items) {
   *     console.log(`${asset.assetKey}: ${asset.name} (${asset.resourceId})`);
   *   }
   * }
   * ```
   * @operationId searchCatalogAssets
   * @tags Catalog
   */
  searchCatalogAssets(input: searchCatalogAssetsInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchCatalogAssets>>;
  searchCatalogAssets(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchCatalogAssets(this, arg, options);
  }

  /**
   * Search files
   *
   * Returns files matching the given search criteria.
   *
   * @example Search the BPMN files in a project
   * ```ts
   * async function searchFilesExample(projectKey: ProjectKey) {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.searchFiles({
   *     filter: { projectKey, type: 'bpmn' },
   *     page: { limit: 50 },
   *   });
   * 
   *   for (const file of result.items) {
   *     console.log(`${file.fileKey}: ${file.name}`);
   *   }
   * }
   * ```
   * @operationId searchFiles
   * @tags File
   */
  searchFiles(input: searchFilesInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchFiles>>;
  searchFiles(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchFiles(this, arg, options);
  }

  /**
   * Search members
   *
   * Returns members matching the given search criteria. A workspace key filter is required — members cannot be searched across workspaces.
   *
   * @example Search the members of a workspace
   * ```ts
   * async function searchMembersExample(workspaceKey: WorkspaceKey) {
   *   const hub = createHubClient();
   * 
   *   // The workspaceKey filter is required.
   *   const result = await hub.searchMembers({
   *     filter: { workspaceKey, role: 'workspace_admin' },
   *   });
   * 
   *   for (const member of result.items) {
   *     console.log(`${member.email} (${member.name ?? 'invited'})`);
   *   }
   * }
   * ```
   * @operationId searchMembers
   * @tags Member
   */
  searchMembers(input: searchMembersInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchMembers>>;
  searchMembers(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchMembers(this, arg, options);
  }

  /**
   * Search the catalog assets used within a project
   *
   * Returns the catalog assets that are used within the project with the given project key, matching the given
   * search criteria.
   *
   * @example Search the catalog assets a project uses
   * ```ts
   * async function searchProjectCatalogAssetUsagesExample(projectKey: ProjectKey) {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.searchProjectCatalogAssetUsages({ projectKey, page: { limit: 20 } });
   * 
   *   for (const usage of result.items) {
   *     console.log(usage);
   *   }
   * }
   * ```
   * @operationId searchProjectCatalogAssetUsages
   * @tags Catalog
   */
  searchProjectCatalogAssetUsages(input: searchProjectCatalogAssetUsagesInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchProjectCatalogAssetUsages>>;
  searchProjectCatalogAssetUsages(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchProjectCatalogAssetUsages(this, arg, options);
  }

  /**
   * Search projects
   *
   * Returns projects matching the given search criteria across all workspaces in the caller's organization.
   *
   * @example Search the projects in a workspace
   * ```ts
   * async function searchProjectsExample(workspaceKey: WorkspaceKey) {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.searchProjects({
   *     filter: { workspaceKey },
   *     sort: [{ field: 'name', order: 'ASC' }],
   *     page: { from: 0, limit: 50 },
   *   });
   * 
   *   console.log(`${result.page.totalItems} projects`);
   *   for (const project of result.items) {
   *     console.log(`${project.projectKey}: ${project.name}`);
   *   }
   * }
   * ```
   * @operationId searchProjects
   * @tags Project
   */
  searchProjects(input: searchProjectsInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchProjects>>;
  searchProjects(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchProjects(this, arg, options);
  }

  /**
   * Search project snapshots
   *
   * Returns the project snapshots matching the given search criteria, scoped to the caller's organization. Restoring a project snapshot can create an additional, automatically named project snapshot capturing the state that was replaced; those appear here like any other project snapshot. Filter by `fileVersionKey` to find the project snapshots that captured a given file version.
   *
   * @example Search the snapshots of a project
   * ```ts
   * async function searchProjectSnapshotsExample(projectKey: ProjectKey) {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.searchProjectSnapshots({
   *     filter: { projectKey },
   *     sort: [{ field: 'created', order: 'DESC' }],
   *     page: { limit: 10 },
   *   });
   * 
   *   for (const snapshot of result.items) {
   *     console.log(`${snapshot.projectSnapshotKey}: ${snapshot.name}`);
   *   }
   * }
   * ```
   * @operationId searchProjectSnapshots
   * @tags Project Snapshot
   */
  searchProjectSnapshots(input: searchProjectSnapshotsInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchProjectSnapshots>>;
  searchProjectSnapshots(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchProjectSnapshots(this, arg, options);
  }

  /**
   * Search recently deleted files
   *
   * Returns soft-deleted files scoped to the caller's organization. Only files that are the root of their own deletion are listed; a file soft-deleted as part of an ancestor folder, project, or workspace's deletion event is represented by that ancestor instead, and a file deleted independently before its ancestor stays listed in its own right; use the respective recently-deleted search endpoint to access that ancestor entity. Files remain listed until the retention period expires and the scheduled cleanup job runs; they can also be restored with `POST /files/{fileKey}/restoration` or permanently removed with `DELETE /files/{fileKey}/permanent`.
   *
   * @example Search recently deleted files
   * ```ts
   * async function searchRecentlyDeletedFilesExample() {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.searchRecentlyDeletedFiles({ page: { limit: 20 } });
   * 
   *   for (const file of result.items) {
   *     console.log(`Deleted: ${file.name}`);
   *   }
   * }
   * ```
   * @operationId searchRecentlyDeletedFiles
   * @tags File
   */
  searchRecentlyDeletedFiles(input: searchRecentlyDeletedFilesInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchRecentlyDeletedFiles>>;
  searchRecentlyDeletedFiles(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchRecentlyDeletedFiles(this, arg, options);
  }

  /**
   * Search recently deleted folders
   *
   * Returns soft-deleted folders scoped to the caller's organization. Only folders that are the root of their own deletion are listed; a folder soft-deleted as part of an ancestor folder, project, or workspace's deletion event is represented by that ancestor instead, and a folder deleted independently before its ancestor stays listed in its own right; use the respective recently-deleted search endpoint to access that ancestor entity. Folders remain listed until the retention period expires and the scheduled cleanup job runs; they can also be restored with `POST /folders/{folderKey}/restoration` or permanently removed with `DELETE /folders/{folderKey}/permanent`.
   *
   * @example Search recently deleted folders
   * ```ts
   * async function searchRecentlyDeletedFoldersExample() {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.searchRecentlyDeletedFolders({ page: { limit: 20 } });
   * 
   *   for (const folder of result.items) {
   *     console.log(`Deleted: ${folder.name}`);
   *   }
   * }
   * ```
   * @operationId searchRecentlyDeletedFolders
   * @tags Folder
   */
  searchRecentlyDeletedFolders(input: searchRecentlyDeletedFoldersInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchRecentlyDeletedFolders>>;
  searchRecentlyDeletedFolders(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchRecentlyDeletedFolders(this, arg, options);
  }

  /**
   * Search recently deleted projects
   *
   * Returns soft-deleted projects scoped to the caller's organization. Only projects that are the root of their own deletion are listed; a project soft-deleted as part of an ancestor workspace's deletion event is represented by that workspace instead, and a project deleted independently before its workspace stays listed in its own right; use the respective recently-deleted search endpoint to access that workspace entity. Projects remain listed until the retention period expires and the scheduled cleanup job runs; they can also be restored with `POST /projects/{projectKey}/restoration` or permanently removed with `DELETE /projects/{projectKey}/permanent`.
   *
   * @example Search recently deleted projects
   * ```ts
   * async function searchRecentlyDeletedProjectsExample() {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.searchRecentlyDeletedProjects({ page: { limit: 20 } });
   * 
   *   for (const project of result.items) {
   *     console.log(`Deleted: ${project.name}`);
   *   }
   * }
   * ```
   * @operationId searchRecentlyDeletedProjects
   * @tags Project
   */
  searchRecentlyDeletedProjects(input: searchRecentlyDeletedProjectsInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchRecentlyDeletedProjects>>;
  searchRecentlyDeletedProjects(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchRecentlyDeletedProjects(this, arg, options);
  }

  /**
   * Search recently deleted workspaces
   *
   * Returns soft-deleted workspaces scoped to the caller's organization. Workspaces remain listed until the retention period expires and the scheduled cleanup job runs; they can also be restored with `POST /workspaces/{workspaceKey}/restoration` or permanently removed with `DELETE /workspaces/{workspaceKey}/permanent`.
   *
   * @example Search recently deleted workspaces
   * ```ts
   * async function searchRecentlyDeletedWorkspacesExample() {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.searchRecentlyDeletedWorkspaces({ page: { limit: 20 } });
   * 
   *   for (const workspace of result.items) {
   *     console.log(`Deleted: ${workspace.name}`);
   *   }
   * }
   * ```
   * @operationId searchRecentlyDeletedWorkspaces
   * @tags Workspace
   */
  searchRecentlyDeletedWorkspaces(input: searchRecentlyDeletedWorkspacesInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchRecentlyDeletedWorkspaces>>;
  searchRecentlyDeletedWorkspaces(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchRecentlyDeletedWorkspaces(this, arg, options);
  }

  /**
   * Search versions
   *
   * Returns versions matching the given search criteria.
   *
   * @example Search the versions of a file
   * ```ts
   * async function searchVersionsExample(fileKey: FileKey) {
   *   const hub = createHubClient();
   * 
   *   // The fileKey filter is required.
   *   const result = await hub.searchVersions({
   *     filter: { fileKey },
   *     sort: [{ field: 'created', order: 'DESC' }],
   *   });
   * 
   *   for (const version of result.items) {
   *     console.log(`${version.name}: ${version.description ?? ''}`);
   *   }
   * }
   * ```
   * @operationId searchVersions
   * @tags Version
   */
  searchVersions(input: searchVersionsInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchVersions>>;
  searchVersions(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchVersions(this, arg, options);
  }

  /**
   * Search workspaces
   *
   * Returns workspaces matching the given search criteria. Results are scoped to the caller's organization.
   *
   * @example Search workspaces
   * ```ts
   * async function searchWorkspacesExample() {
   *   const hub = createHubClient();
   * 
   *   const result = await hub.searchWorkspaces({
   *     filter: { name: { $like: 'Pay*' } },
   *     sort: [{ field: 'name', order: 'ASC' }],
   *     page: { from: 0, limit: 20 },
   *   });
   * 
   *   for (const workspace of result.items) {
   *     console.log(`${workspace.workspaceKey}: ${workspace.name}`);
   *   }
   * }
   * ```
   * @operationId searchWorkspaces
   * @tags Workspace
   */
  searchWorkspaces(input: searchWorkspacesInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.searchWorkspaces>>;
  searchWorkspaces(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.searchWorkspaces(this, arg, options);
  }

  /**
   * Submit a review decision for a project snapshot
   *
   * Records a review decision, with an optional comment, for a project snapshot that has a review request. A snapshot keeps accepting reviews as long as its request has not been superseded, so a follow-up review can be submitted after an earlier one. Submitting a review for a snapshot with no review request at all is rejected with `403`.
   * Submitting a review adds a system-authored comment to the project's BPMN files. The review is attributed to the public API user rather than to a person, and the API does not enforce that the reviewer differs from whoever created the snapshot.
   *
   * @example Approve a snapshot
   * ```ts
   * async function submitProjectSnapshotReviewExample(projectSnapshotKey: ProjectSnapshotKey) {
   *   const hub = createHubClient();
   * 
   *   const review = await hub.submitProjectSnapshotReview({
   *     projectSnapshotKey,
   *     status: 'APPROVED',
   *     comment: 'Looks good to me',
   *   });
   * 
   *   console.log(review);
   * }
   * ```
   * @operationId submitProjectSnapshotReview
   * @tags Project Snapshot
   */
  submitProjectSnapshotReview(input: submitProjectSnapshotReviewInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.submitProjectSnapshotReview>>;
  submitProjectSnapshotReview(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.submitProjectSnapshotReview(this, arg, options);
  }

  /**
   * Update a file
   *
   * Updates the metadata and/or content of an existing file.
   *
   * @example Update the content of a file
   * ```ts
   * async function updateFileExample(fileKey: FileKey, newXml: string) {
   *   const hub = createHubClient();
   * 
   *   // Optimistic locking: pass the revision you last read.
   *   const current = await hub.getFile({ fileKey });
   *   const updated = await hub.updateFile({
   *     fileKey,
   *     content: newXml,
   *     revision: current.revision,
   *   });
   * 
   *   console.log(`Now at revision ${updated.revision}`);
   * }
   * ```
   * @operationId updateFile
   * @tags File
   */
  updateFile(input: updateFileInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.updateFile>>;
  updateFile(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.updateFile(this, arg, options);
  }

  /**
   * Update a folder
   *
   * Updates the name and/or location of an existing folder.
   *
   * @example Move a folder under another folder
   * ```ts
   * async function updateFolderExample(folderKey: FolderKey, parentFolderKey: FolderKey) {
   *   const hub = createHubClient();
   * 
   *   const folder = await hub.updateFolder({ folderKey, parentFolderKey });
   * 
   *   console.log(`Folder ${folder.name} moved`);
   * }
   * ```
   * @operationId updateFolder
   * @tags Folder
   */
  updateFolder(input: updateFolderInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.updateFolder>>;
  updateFolder(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.updateFolder(this, arg, options);
  }

  /**
   * Update a project
   *
   * Updates the name and/or workspace of an existing project.
   *
   * @example Rename or move a project
   * ```ts
   * async function updateProjectExample(projectKey: ProjectKey, targetWorkspace: WorkspaceKey) {
   *   const hub = createHubClient();
   * 
   *   const project = await hub.updateProject({
   *     projectKey,
   *     name: 'Order Fulfilment v2',
   *     workspaceKey: targetWorkspace,
   *   });
   * 
   *   console.log(`Project now in workspace ${project.workspaceKey}`);
   * }
   * ```
   * @operationId updateProject
   * @tags Project
   */
  updateProject(input: updateProjectInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.updateProject>>;
  updateProject(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.updateProject(this, arg, options);
  }

  /**
   * Update a project snapshot
   *
   * Updates the attributes of an existing project snapshot.
   *
   * @example Update a project snapshot
   * ```ts
   * async function updateProjectSnapshotExample(projectSnapshotKey: ProjectSnapshotKey) {
   *   const hub = createHubClient();
   * 
   *   const snapshot = await hub.updateProjectSnapshot({
   *     projectSnapshotKey,
   *     description: 'Hotfix included',
   *   });
   * 
   *   console.log(`Updated: ${snapshot.name}`);
   * }
   * ```
   * @operationId updateProjectSnapshot
   * @tags Project Snapshot
   */
  updateProjectSnapshot(input: updateProjectSnapshotInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.updateProjectSnapshot>>;
  updateProjectSnapshot(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.updateProjectSnapshot(this, arg, options);
  }

  /**
   * Update a version
   *
   * Updates the attributes of an existing version.
   *
   * @example Publish a version to shared resources
   * ```ts
   * async function updateVersionExample(versionKey: VersionKey) {
   *   const hub = createHubClient();
   * 
   *   const version = await hub.updateVersion({ versionKey, organizationPublic: true });
   * 
   *   console.log(`Published: ${version.organizationPublic}`);
   * }
   * ```
   * @operationId updateVersion
   * @tags Version
   */
  updateVersion(input: updateVersionInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.updateVersion>>;
  updateVersion(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.updateVersion(this, arg, options);
  }

  /**
   * Update a workspace
   *
   * Updates an existing workspace.
   *
   * @example Rename a workspace
   * ```ts
   * async function updateWorkspaceExample(workspaceKey: WorkspaceKey) {
   *   const hub = createHubClient();
   * 
   *   const workspace = await hub.updateWorkspace({ workspaceKey, name: 'Payments (EU)' });
   * 
   *   console.log(`Renamed to: ${workspace.name}`);
   * }
   * ```
   * @operationId updateWorkspace
   * @tags Workspace
   */
  updateWorkspace(input: updateWorkspaceInput, options?: OperationOptions): CancelablePromise<_DataOf<typeof Sdk.updateWorkspace>>;
  updateWorkspace(arg: any, options?: OperationOptions): CancelablePromise<any> {
    return Ops.updateWorkspace(this, arg, options);
  }

// === AUTO-GENERATED HUB METHODS END ===
}

/**
 * Public Hub client type: the base class augmented with `.paginate(...)` on
 * every `search*` operation. The `.paginate` methods are installed at runtime by
 * the constructor (via `installSearchPagination`), so both construction paths —
 * the `createHubClient` factory *and* direct `new HubClient()` — yield a value
 * whose static type matches the runtime shape.
 *
 * This is expressed as a separate type + value pair rather than
 * declaration-merging an interface onto the class because
 * `SearchPaginationApi<HubClient>` is self-referential (it maps over
 * `keyof HubClient`), which TypeScript rejects as an interface `extends`
 * clause ("recursively references itself as a base type").
 */
export type HubClient = WithSearchPagination<HubClientBase>;
export const HubClient = HubClientBase as unknown as {
  new (options?: HubOptions): HubClient;
} & typeof HubClientBase;
