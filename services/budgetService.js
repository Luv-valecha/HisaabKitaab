import * as repo from "../repositories/budgets.js";
import * as spending from "../repositories/spending.js";
import * as personalRepo from "../repositories/personal.js";
import * as categories from "../repositories/categories.js";
import { rupeesToPaise, formatINR } from "../lib/calculations/money.js";
import { badRequest } from "../lib/api/errors.js";
import { notify } from "../lib/notifications/notify.js";

export const currentMonth = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata" }).slice(0, 7);

export async function setBudget(userId, { month, categoryId, limit }) {
  if (categoryId && !(await categories.findVisible(categoryId, userId))) throw badRequest("Unknown category");
  await repo.upsert(userId, month, categoryId ?? null, rupeesToPaise(limit));
  await checkBudgetAlerts(userId, month);
  return getMonth(userId, month);
}
export async function setIncome(userId, { month, income }) {
  await repo.setIncome(userId, month, rupeesToPaise(income));
  return getMonth(userId, month);
}
export const removeBudget = (userId, id) => repo.removeOwn(userId, id);

/** Budget / Spent / Remaining / Percent used, derived from real spending. */
export async function getMonth(userId, month) {
  const [rows, byCat, total, income] = await Promise.all([
    repo.listMonth(userId, month), spending.byCategory(userId, month), spending.totalForMonth(userId, month), repo.getIncome(userId, month)]);
  const spentBy = new Map(byCat.map((c) => [c.category_id, c.total]));
  const pct = (spent, limit) => (limit > 0 ? Math.round((spent / limit) * 1000) / 10 : null);
  const items = rows.map((b) => {
    const spent = b.category_id ? spentBy.get(b.category_id) ?? 0 : total;
    return { id: b.id, categoryId: b.category_id, category: b.category_id ? b.category_name : "Overall", limit: b.limit_paise,
      spent, remaining: b.limit_paise - spent, percentUsed: pct(spent, b.limit_paise) };
  });
  const overall = items.find((i) => i.categoryId === null);
  const catItems = items.filter((i) => i.categoryId !== null);
  // Remaining headline: overall budget if set, else sum of category budgets vs spend in those categories.
  const headline = overall ?? (catItems.length ? (() => {
    const limit = catItems.reduce((a, i) => a + i.limit, 0), spent = catItems.reduce((a, i) => a + i.spent, 0);
    return { limit, spent, remaining: limit - spent, percentUsed: pct(spent, limit) };
  })() : null);
  return { month, income, totalSpent: total, headline, items };
}

/** Idempotent 80% / 100% alerts (dedupe key per month+budget). */
export async function checkBudgetAlerts(userId, month) {
  const { items } = await getMonth(userId, month);
  for (const b of items) {
    if (!b.limit) continue;
    const label = b.categoryId ? `${b.category} budget` : "monthly budget";
    if (b.spent >= b.limit) {
      await notify({ userId, type: "BUDGET", message: `You've gone over your ${label} (${formatINR(b.spent)} of ${formatINR(b.limit)}).`, dedupeKey: `budget100:${month}:${b.categoryId ?? "total"}` });
    } else if (b.spent >= b.limit * 0.8) {
      await notify({ userId, type: "BUDGET", message: `You have used ${Math.floor((b.spent / b.limit) * 100)}% of your ${label}.`, dedupeKey: `budget80:${month}:${b.categoryId ?? "total"}` });
    }
  }
}
