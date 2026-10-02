import * as expensesRepo from "../repositories/expenses.js";
import * as groupsRepo from "../repositories/groups.js";
import * as users from "../repositories/users.js";
import { computeNetBalances, computePairwise } from "../lib/calculations/balances.js";
import { simplifyDebts } from "../lib/settlements/simplify.js";
import { query } from "../lib/db/pool.js";
import { assertMember } from "./groupService.js";
import * as direct from "../repositories/direct.js";

export async function netFor(groupId, userId, db) {
  const { expenses, settlements } = await expensesRepo.ledgerForGroup(groupId, db);
  return computeNetBalances(expenses, settlements)[userId] ?? 0;
}

/** Balances for one group: per-member net, direct pairwise debts, and simplified settle-up transfers. */
export async function groupBalances(userId, groupId) {
  await assertMember(groupId, userId);
  const { expenses, settlements } = await expensesRepo.ledgerForGroup(groupId);
  const members = await groupsRepo.listMembers(groupId);
  const names = Object.fromEntries(members.map((m) => [m.id, { id: m.id, name: m.display_name, username: m.username }]));
  const net = computeNetBalances(expenses, settlements);
  for (const m of members) net[m.id] ??= 0;
  const who = (id) => names[id] ?? { id, name: "Former member", username: null };
  return {
    members: members.map((m) => ({ ...who(m.id), net: net[m.id] })),
    pairwise: computePairwise(expenses, settlements).map((p) => ({ from: who(p.from), to: who(p.to), amount: p.amount })),
    suggestions: simplifyDebts(net).map((t) => ({ from: who(t.from), to: who(t.to), amount: t.amount })),
    me: { net: net[userId] ?? 0 },
  };
}

/** Totals for the dashboard / balance screen: all groups PLUS direct balances with friends. */
export async function overview(userId) {
  const gs = await groupsRepo.listForUser(userId);
  const perGroup = [];
  let owe = 0, owed = 0;
  for (const g of gs) {
    const { expenses, settlements } = await expensesRepo.ledgerForGroup(g.id);
    const net = computeNetBalances(expenses, settlements)[userId] ?? 0;
    if (net < 0) owe += -net; else owed += net;
    perGroup.push({ groupId: g.id, name: g.name, net });
  }
  const friends = (await direct.friendNets(userId)).map((f) => ({ userId: f.user_id, name: f.display_name, username: f.username, net: f.net }));
  for (const f of friends) { if (f.net < 0) owe += -f.net; else owed += f.net; }
  return { owe, owed, net: owed - owe, groups: perGroup, friends };
}
