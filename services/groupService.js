import * as groups from "../repositories/groups.js";
import * as users from "../repositories/users.js";
import * as friends from "../repositories/friends.js";
import { withTransaction } from "../lib/db/pool.js";
import { badRequest, forbidden, notFound } from "../lib/api/errors.js";
import { notify } from "../lib/notifications/notify.js";

const dto = (g) => ({ id: g.id, name: g.name, description: g.description, createdBy: g.created_by, createdAt: g.created_at, memberCount: g.member_count });

/** Authorization primitive reused by every group-scoped service. */
export async function assertMember(groupId, userId) {
  const g = await groups.findById(groupId);
  if (!g) throw notFound("Group not found");
  const m = await groups.getMember(groupId, userId);
  if (!m) throw notFound("Group not found"); // 404 (not 403) so non-members can't probe for group ids
  return { group: g, role: m.role };
}
const assertOwner = (role) => { if (role !== "OWNER") throw forbidden("Only the group owner can do this"); };

export async function create(userId, input) {
  const g = await withTransaction((db) => groups.create({ ...input, createdBy: userId }, db));
  return dto(g);
}
export const list = async (userId) => (await groups.listForUser(userId)).map(dto);

export async function get(userId, groupId) {
  const { group, role } = await assertMember(groupId, userId);
  const members = await groups.listMembers(groupId);
  return { ...dto(group), myRole: role, members: members.map((m) => ({ ...users.toUserDto(m), role: m.role })) };
}
export async function update(userId, groupId, input) {
  const { role } = await assertMember(groupId, userId);
  assertOwner(role);
  return dto(await groups.update(groupId, input));
}
export async function remove(userId, groupId) {
  const { role } = await assertMember(groupId, userId);
  assertOwner(role);
  await groups.remove(groupId);
}
export async function addMember(userId, groupId, newUserId) {
  const { group } = await assertMember(groupId, userId);
  if (newUserId === userId) throw badRequest("You're already in this group");
  if (!(await friends.areFriends(userId, newUserId))) throw forbidden("You can only add people who are your friends");
  await groups.addMember(groupId, newUserId);
  const me = await users.findById(userId);
  await notify({ userId: newUserId, type: "GROUP_ADDED", message: `${me.display_name} added you to "${group.name}".`, data: { groupId } });
}
export async function removeMember(userId, groupId, targetId) {
  const { role } = await assertMember(groupId, userId);
  if (targetId !== userId) assertOwner(role); // anyone can leave; only owner can remove others
  const target = await groups.getMember(groupId, targetId);
  if (!target) throw notFound("That person isn't in this group");
  if (target.role === "OWNER") throw badRequest("The owner can't leave. Delete the group instead.");
  // Prevent leaving with unsettled balance (would corrupt the ledger).
  const { netFor } = await import("./balanceService.js");
  if ((await netFor(groupId, targetId)) !== 0) throw badRequest("Settle this person's balance before removing them");
  await groups.removeMember(groupId, targetId);
}
