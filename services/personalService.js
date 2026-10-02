import * as repo from "../repositories/personal.js";
import * as categories from "../repositories/categories.js";
import { spendingRange } from "./_range.js";
import { rupeesToPaise } from "../lib/calculations/money.js";
import { badRequest, notFound } from "../lib/api/errors.js";
import { checkBudgetAlerts } from "./budgetService.js";

const dto = (r) => ({ id: r.id, kind: r.kind, amount: r.amount_paise, description: r.description,
  category: r.category_id ? { id: r.category_id, name: r.category_name } : null, date: r.txn_date, notes: r.notes, recurringId: r.recurring_id });

async function prep(userId, input) {
  const amountPaise = rupeesToPaise(input.amount);
  if (amountPaise <= 0) throw badRequest("Amount must be greater than zero");
  if (input.categoryId && !(await categories.findVisible(input.categoryId, userId))) throw badRequest("Unknown category");
  return { ...input, amountPaise };
}
export async function create(userId, input) {
  const t = await prep(userId, input);
  const id = await repo.insert(userId, t);
  const row = await repo.findOwn(userId, id);
  await checkBudgetAlerts(userId, row.txn_date.slice(0, 7));
  return dto(row);
}
export async function update(userId, id, input) {
  if (!(await repo.findOwn(userId, id))) throw notFound("Transaction not found");
  await repo.update(userId, id, await prep(userId, input));
  const row = await repo.findOwn(userId, id);
  await checkBudgetAlerts(userId, row.txn_date.slice(0, 7));
  return dto(row);
}
export async function remove(userId, id) { if (!(await repo.remove(userId, id))) throw notFound("Transaction not found"); }
export async function list(userId, month) {
  const [from, to] = spendingRange(month);
  return (await repo.listMonth(userId, from, to)).map(dto);
}
