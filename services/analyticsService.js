import * as spending from "../repositories/spending.js";
import * as personalRepo from "../repositories/personal.js";
import * as budgetRepo from "../repositories/budgets.js";
import { query } from "../lib/db/pool.js";
import { SPEND_CTE, monthRange } from "../repositories/spending.js";
import { getMonth, currentMonth } from "./budgetService.js";
import { overview } from "./balanceService.js";
import { spendingRange } from "./_range.js";

const addMonths = (month, n) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const daysInMonth = (month) => { const [y, m] = month.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };

export async function personal(userId, monthIn) {
  spendingRange(monthIn); // validates
  const month = monthIn ?? currentMonth();
  const prev = addMonths(month, -1);
  const [total, prevTotal, byCat, trendRows, budget, largest] = await Promise.all([
    spending.totalForMonth(userId, month), spending.totalForMonth(userId, prev), spending.byCategory(userId, month),
    spending.monthlyTotals(userId, addMonths(month, -5), addMonths(month, 1)), getMonth(userId, month), spending.largest(userId, month)]);
  const [from, to] = monthRange(month);
  const incomeTxns = await personalRepo.incomeForMonth(userId, from, to);
  const declared = budget.income;
  const income = declared ?? incomeTxns; // declared monthly income wins; else sum of INCOME transactions
  const elapsed = month === currentMonth() ? Number(new Date().toLocaleDateString("en-CA", { timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata" }).slice(8)) : daysInMonth(month);
  const trendMap = new Map(trendRows.map((r) => [r.month, r.total]));
  const trend = Array.from({ length: 6 }, (_, i) => { const m = addMonths(month, i - 5); return { month: m, total: trendMap.get(m) ?? 0 }; });
  return {
    month, totalSpent: total,
    byCategory: byCat.map((c) => ({ categoryId: c.category_id, name: c.name, total: c.total })),
    highestCategory: byCat[0] ? { name: byCat[0].name, total: byCat[0].total } : null,
    trend,
    monthOverMonth: { previousMonth: prev, previousTotal: prevTotal, change: total - prevTotal,
      percentChange: prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : null },
    averageDaily: Math.round(total / Math.max(1, elapsed)),
    budgetVsActual: budget.items.map((b) => ({ category: b.category, limit: b.limit, spent: b.spent, percentUsed: b.percentUsed })),
    incomeVsExpenses: { income, expenses: total, savings: income - total },
    largestExpenses: largest.map((l) => ({ id: l.id, description: l.description, amount: l.amount, date: l.date, category: l.category, source: l.source })),
  };
}

export async function shared(userId, monthIn) {
  spendingRange(monthIn);
  const month = monthIn ?? currentMonth();
  const [from, to] = monthRange(month);
  const ov = await overview(userId);
  const paid = (await query(
    `SELECT COALESCE(sum(e.amount_paise - COALESCE(s.owed_paise,0)),0)::bigint AS t
     FROM expenses e LEFT JOIN expense_splits s ON s.expense_id=e.id AND s.user_id=$1 WHERE e.paid_by=$1`, [userId])).rows[0].t;
  const settle = (await query(
    `SELECT COALESCE(sum(amount_paise) FILTER (WHERE from_user=$1),0)::bigint AS paid, COALESCE(sum(amount_paise) FILTER (WHERE to_user=$1),0)::bigint AS received
     FROM settlements WHERE from_user=$1 OR to_user=$1`, [userId])).rows[0];
  const groupSpend = (await query(
    `SELECT g.id, g.name, COALESCE(sum(e.amount_paise),0)::bigint AS total FROM groups g
     JOIN group_members m ON m.group_id=g.id AND m.user_id=$1
     LEFT JOIN expenses e ON e.group_id=g.id AND e.expense_date >= $2 AND e.expense_date < $3
     GROUP BY g.id ORDER BY total DESC`, [userId, from, to])).rows;
  const over = (await query(
    `SELECT to_char(date_trunc('month', e.expense_date),'YYYY-MM') AS month, sum(e.amount_paise)::bigint AS total
     FROM expenses e JOIN group_members m ON m.group_id=e.group_id AND m.user_id=$1
     WHERE e.expense_date >= $2 AND e.expense_date < $3 GROUP BY 1 ORDER BY 1`, [userId, `${addMonths(month, -5)}-01`, to])).rows;
  const overMap = new Map(over.map((r) => [r.month, r.total]));
  const cats = (await query(
    `SELECT COALESCE(c.name,'Uncategorised') AS name, sum(e.amount_paise)::bigint AS total FROM expenses e
     JOIN group_members m ON m.group_id=e.group_id AND m.user_id=$1 LEFT JOIN categories c ON c.id=e.category_id
     WHERE e.expense_date >= $2 AND e.expense_date < $3 GROUP BY 1 ORDER BY total DESC`, [userId, from, to])).rows;
  return {
    month,
    amountPaidForOthers: paid, // lifetime: cash fronted beyond own share
    owedToMe: ov.owed, iOwe: ov.owe, net: ov.net,
    settlements: { paid: settle.paid, received: settle.received },
    groupSpending: groupSpend.map((g) => ({ groupId: g.id, name: g.name, total: g.total })),
    groupSpendingOverTime: Array.from({ length: 6 }, (_, i) => { const m = addMonths(month, i - 5); return { month: m, total: overMap.get(m) ?? 0 }; }),
    categoryBreakdown: cats.map((c) => ({ name: c.name, total: c.total })),
  };
}

export async function dashboard(userId) {
  const month = currentMonth();
  const [ov, budget] = await Promise.all([overview(userId), getMonth(userId, month)]);
  return { month, owe: ov.owe, owed: ov.owed, net: ov.net, monthSpending: budget.totalSpent,
    budgetRemaining: budget.headline ? budget.headline.remaining : null, budgetPercentUsed: budget.headline?.percentUsed ?? null };
}
