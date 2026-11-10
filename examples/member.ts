// Compilable usage examples for workspace member operations.
// These examples are type-checked during build to guard against API regressions.

import { createHubClient, MemberEmail, type WorkspaceKey } from '@camunda8/hub-api';

//#region AddMember
async function addMemberExample(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();

  // Member emails are client-minted keys: brand them with MemberEmail.assumeExists.
  const member = await hub.addMember({
    workspaceKey,
    email: MemberEmail.assumeExists('alice@example.com'),
    role: 'editor',
  });

  console.log(`${member.email} is now ${member.role}`);
}
//#endregion AddMember

//#region RemoveMember
async function removeMemberExample(workspaceKey: WorkspaceKey, email: MemberEmail) {
  const hub = createHubClient();

  await hub.removeMember({ workspaceKey, email });
}
//#endregion RemoveMember

//#region SearchMembers
async function searchMembersExample(workspaceKey: WorkspaceKey) {
  const hub = createHubClient();

  // The workspaceKey filter is required.
  const result = await hub.searchMembers({
    filter: { workspaceKey, role: 'workspace_admin' },
  });

  for (const member of result.items) {
    console.log(`${member.email} (${member.name ?? 'invited'})`);
  }
}
//#endregion SearchMembers

void addMemberExample;
void removeMemberExample;
void searchMembersExample;
