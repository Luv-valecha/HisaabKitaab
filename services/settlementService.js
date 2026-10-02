import * as repo from "../repositories/settlements.js";
import * as groupsRepo from "../repositories/groups.js";
import * as users from "../repositories/users.js";
import { badRequest, forbidden } from "../lib/api/errors.js";
import { rupeesToPaise, formatINR } from "../lib/calculations/money.js";
import { notify } from "../lib/notifications/notify.js";
import { assertMember } from "./groupService.js";

const dto = (r) => ({
  id: r.id, groupId: r.group_id, groupName: r.group_name, amount: r.amount_paise, note: r.note, settledAt: r.settled_at,
  from: { id: r.from_user, name: r.from_name, username: r.from_username },
  to: { id: r.to_user, name: r.to_name, username: r.to_username },
});

export async function record(userId, groupId, input) {
  await assertMember(groupId, userId);
  const amountPaise = rupeesToPaise(input.amount);
  if (amountPaise <= 0) throw badRequest("Amount must be greater than zero");
  if (input.fromUser === input.toUser) throw badRequest("Payer and receiver must be different people");
  if (userId !== input.fromUser && userId !== input.toUser) throw forbidden("You can only record payments you made or received");
  for (const id of [input.fromUser, input.toUser]) {
    if (!(await groupsRepo.getMember(groupId, id))) throw badRequest("Both people must be members of the group");
  }
  const s = await repo.insert({ groupId, fromUser: input.fromUser, toUser: input.toUser, amountPaise, note: input.note, createdBy: userId });
  const other = userId === input.fromUser ? input.toUser : input.fromUser;
  const me = await users.findById(userId);
  const msg = userId === input.fromUser
    ? `${me.display_name} paid you ${formatINR(amountPaise)}.`
    : `${me.display_name} recorded that you paid them ${formatINR(amountPaise)}.`;
  await notify({ userId: other, type: "SETTLEMENT", message: msg, data: { groupId, settlementId: s.id } });
  return { id: s.id, groupId, amount: amountPaise, settledAt: s.settled_at };
}
export async function listForGroup(userId, groupId) {
  await assertMember(groupId, userId);
  return (await repo.listByGroup(groupId)).map(dto);
}
export async function listMine(userId) { return (await repo.listForUser(userId)).map(dto); }
