import * as repo from "../repositories/expenses.js";
import * as groupsRepo from "../repositories/groups.js";
import * as categories from "../repositories/categories.js";
import * as users from "../repositories/users.js";
import * as friends from "../repositories/friends.js";
import { withTransaction, query } from "../lib/db/pool.js";
import { badRequest, forbidden, notFound } from "../lib/api/errors.js";
import { rupeesToPaise, formatINR } from "../lib/calculations/money.js";
import { computeSplits } from "../lib/calculations/splits.js";
import { toSplitInput } from "../lib/calculations/splitInput.js";
import { notify } from "../lib/notifications/notify.js";
import { assertMember } from "./groupService.js";
import { checkBudgetAlerts } from "./budgetService.js";

const dto = (r) => ({
  id: r.id, groupId: r.group_id, description: r.description, amount: r.amount_paise,
  category: r.category_id ? { id: r.category_id, name: r.category_name } : null,
  date: r.expense_date, notes: r.notes, splitType: r.split_type,
  paidBy: { id: r.paid_by, name: r.paid_by_name, username: r.paid_by_username },
  createdBy: r.created_by, recurringId: r.recurring_id,
  splits: r.splits.map((s) => ({ userId: s.userId, name: s.name, username: s.username, owed: s.owed })),
});
export const toExpenseDto = dto;

async function baseChecks(userId, input) {
  const amountPaise = rupeesToPaise(input.amount);
  if (amountPaise <= 0) throw badRequest("Amount must be greater than zero");
  const splits = computeSplits(amountPaise, toSplitInput(input.split));
  if (input.categoryId && !(await categories.findVisible(input.categoryId, userId))) throw badRequest("Unknown category");
  return { amountPaise, splits };
}

/** Group expense: payer and everyone in the split must be group members. */
async function prepareGroup(groupId, userId, input) {
  const { amountPaise, splits } = await baseChecks(userId, input);
  const members = new Set((await groupsRepo.listMembers(groupId)).map((m) => m.id));
  if (!members.has(input.paidBy)) throw badRequest("The payer must be a member of the group");
  for (const s of splits) if (!members.has(s.userId)) throw badRequest("Everyone in the split must be a member of the group");
  return { amountPaise, splits };
}

/**
 * Direct (no group) expense between friends. Rules:
 *  - you must be involved (you paid, or you share it)
 *  - at least one other person
 *  - every other person involved must be YOUR friend
 */
async function prepareDirect(userId, input) {
  const { amountPaise, splits } = await baseChecks(userId, input);
  const parties = new Set([input.paidBy, ...splits.map((s) => s.userId)]);
  if (input.paidBy !== userId && !splits.some((s) => s.userId === userId)) throw badRequest("You must be part of this expense: either you paid, or you share it");
  if (!parties.has(userId)) parties.add(userId);
  if (parties.size < 2) throw badRequest("Pick at least one friend to split with. For a solo expense, add it as a personal expense instead.");
  for (const id of parties) {
    if (id !== userId && !(await friends.areFriends(userId, id))) throw forbidden("You can only split directly with your friends");
  }
  return { amountPaise, splits };
}

async function persist({ groupId, createdBy, input, amountPaise, splits, recurringId = null, occurrenceDate = null, db }) {
  const run = async (client) => {
    const e = await repo.insert(client, { groupId, paidBy: input.paidBy, createdBy, amountPaise, description: input.description,
      categoryId: input.categoryId, date: input.date, notes: input.notes, splitType: input.split.type, recurringId, occurrenceDate });
    await repo.replaceSplits(client, e.id, splits);
    return e;
  };
  return db ? run(db) : withTransaction(run);
}

/** Core group creator, shared by the API and by recurring generation. */
export async function createInGroup({ groupId, createdBy, input, recurringId = null, occurrenceDate = null, db }) {
  const { amountPaise, splits } = await prepareGroup(groupId, createdBy, input);
  const expense = await persist({ groupId, createdBy, input, amountPaise, splits, recurringId, occurrenceDate, db });
  return { expense, splits, amountPaise };
}

async function afterChange({ groupId, actorId, expense, splits, amountPaise, verb }) {
  const actor = await users.findById(actorId);
  const payer = await users.findById(expense.paid_by);
  for (const s of splits) {
    if (s.userId !== actorId && s.owed > 0) {
      const msg = s.userId === expense.paid_by
        ? `${actor.display_name} ${verb} a ${formatINR(amountPaise)} expense "${expense.description}".`
        : `${actor.display_name} ${verb} "${expense.description}" (${formatINR(amountPaise)}). You owe ${payer.display_name} ${formatINR(s.owed)}.`;
      await notify({ userId: s.userId, type: "EXPENSE", message: msg, data: { groupId, expenseId: expense.id } });
    }
  }
  for (const s of splits) {
    try { await checkBudgetAlerts(s.userId, expense.expense_date.slice(0, 7)); } catch (e) { console.error("budget alert failed", e); }
  }
}

export async function create(userId, groupId, input) {
  await assertMember(groupId, userId);
  const r = await createInGroup({ groupId, createdBy: userId, input });
  await afterChange({ groupId, actorId: userId, expense: r.expense, splits: r.splits, amountPaise: r.amountPaise, verb: "added" });
  return dto(await repo.getDetailed(r.expense.id));
}

/** Split with friends, no group. */
export async function createDirect(userId, input) {
  const { amountPaise, splits } = await prepareDirect(userId, input);
  const expense = await persist({ groupId: null, createdBy: userId, input, amountPaise, splits });
  await afterChange({ groupId: null, actorId: userId, expense, splits, amountPaise, verb: "added" });
  return dto(await repo.getDetailed(expense.id));
}

const isInvolved = async (e, userId) =>
  e.paid_by === userId || (await query("SELECT 1 FROM expense_splits WHERE expense_id=$1 AND user_id=$2", [e.id, userId])).rowCount > 0;

async function loadAuthorized(userId, expenseId) {
  const e = await repo.findById(expenseId);
  if (!e) throw notFound("Expense not found");
  let canEdit;
  if (e.group_id) {
    const { role } = await assertMember(e.group_id, userId);
    canEdit = role === "OWNER" || e.created_by === userId || e.paid_by === userId;
  } else {
    if (!(await isInvolved(e, userId))) throw notFound("Expense not found");
    canEdit = e.created_by === userId || e.paid_by === userId;
  }
  if (!canEdit) throw forbidden("Only the person who added or paid for this expense, or the group owner, can change it");
  return e;
}

export async function update(userId, expenseId, input) {
  const existing = await loadAuthorized(userId, expenseId);
  const { amountPaise, splits } = existing.group_id ? await prepareGroup(existing.group_id, userId, input) : await prepareDirect(userId, input);
  const e = await withTransaction(async (db) => {
    const row = await repo.update(db, expenseId, { paidBy: input.paidBy, amountPaise, description: input.description,
      categoryId: input.categoryId, date: input.date, notes: input.notes, splitType: input.split.type });
    await repo.replaceSplits(db, expenseId, splits);
    return row;
  });
  await afterChange({ groupId: existing.group_id, actorId: userId, expense: e, splits, amountPaise, verb: "updated" });
  return dto(await repo.getDetailed(expenseId));
}

export async function remove(userId, expenseId) {
  const e = await loadAuthorized(userId, expenseId);
  await repo.remove(expenseId); // splits cascade; balances are derived, so nothing else to fix
  return { groupId: e.group_id };
}

export async function listForGroup(userId, groupId) {
  await assertMember(groupId, userId);
  return (await repo.listByGroup(groupId)).map(dto);
}
export async function get(userId, expenseId) {
  const e = await repo.findById(expenseId);
  if (!e) throw notFound("Expense not found");
  if (e.group_id) await assertMember(e.group_id, userId);
  else if (!(await isInvolved(e, userId))) throw notFound("Expense not found");
  return dto(await repo.getDetailed(expenseId));
}
