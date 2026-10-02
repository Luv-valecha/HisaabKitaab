import * as direct from "../repositories/direct.js";
import * as users from "../repositories/users.js";
import * as friends from "../repositories/friends.js";
import * as settlementsRepo from "../repositories/settlements.js";
import { badRequest, forbidden, notFound } from "../lib/api/errors.js";
import { rupeesToPaise, formatINR } from "../lib/calculations/money.js";
import { pairBalance } from "../lib/calculations/pairBalance.js";
import { notify } from "../lib/notifications/notify.js";
import { toExpenseDto } from "./expenseService.js";

export async function friendBalances(userId) {
  return (await direct.friendNets(userId)).map((r) => ({ userId: r.user_id, username: r.username, name: r.display_name, net: r.net }));
}

/** Friends, or people you still have a balance/history with after unfriending (so money never gets stranded). */
async function assertCanDealWith(userId, otherId) {
  if (userId === otherId) throw badRequest("That's you");
  if (await friends.areFriends(userId, otherId)) return;
  const [e, s] = await Promise.all([direct.expensesBetween(userId, otherId), direct.settlementsBetween(userId, otherId)]);
  if (!e.length && !s.length) throw notFound("Friend not found");
}

export async function ledger(userId, otherId) {
  const other = await users.findById(otherId);
  if (!other) throw notFound("Friend not found");
  await assertCanDealWith(userId, otherId);
  const [expenses, settlements] = await Promise.all([direct.expensesBetween(userId, otherId), direct.settlementsBetween(userId, otherId)]);
  const net = pairBalance(userId, otherId,
    expenses.map((e) => ({ paidBy: e.paid_by, splits: e.splits.map((s) => ({ userId: s.userId, owed: s.owed })) })),
    settlements.map((s) => ({ fromUser: s.from_user, toUser: s.to_user, amount: s.amount_paise })));
  return {
    friend: { id: other.id, username: other.username, displayName: other.display_name },
    net,
    expenses: expenses.map(toExpenseDto),
    settlements: settlements.map((s) => ({ id: s.id, amount: s.amount_paise, note: s.note, settledAt: s.settled_at,
      from: { id: s.from_user, name: s.from_name }, to: { id: s.to_user, name: s.to_name } })),
  };
}

export async function recordSettlement(userId, { fromUser, toUser, amount, note }) {
  const amountPaise = rupeesToPaise(amount);
  if (amountPaise <= 0) throw badRequest("Amount must be greater than zero");
  if (fromUser === toUser) throw badRequest("Payer and receiver must be different people");
  if (userId !== fromUser && userId !== toUser) throw forbidden("You can only record payments you made or received");
  const other = userId === fromUser ? toUser : fromUser;
  await assertCanDealWith(userId, other);
  const s = await settlementsRepo.insert({ groupId: null, fromUser, toUser, amountPaise, note, createdBy: userId });
  const me = await users.findById(userId);
  await notify({ userId: other, type: "SETTLEMENT", data: { settlementId: s.id },
    message: userId === fromUser ? `${me.display_name} paid you ${formatINR(amountPaise)}.` : `${me.display_name} recorded that you paid them ${formatINR(amountPaise)}.` });
  return { id: s.id, amount: amountPaise, settledAt: s.settled_at };
}
