import { query } from "../lib/db/pool.js";

/**
 * PERSONAL SPENDING (Section 15). Two sources, never the gross amount of a shared bill:
 *  1. the user's own personal EXPENSE transactions
 *  2. the user's own SHARE (expense_splits.owed_paise) of every group expense
 * Reimbursements/settlements are transfers and appear in neither.
 * $1 is always the user id.
 */
export const SPEND_CTE = `WITH spend AS (
  SELECT id, txn_date AS d, amount_paise AS amt, category_id AS cat, description, 'PERSONAL'::text AS src, NULL::uuid AS group_id
    FROM personal_transactions WHERE user_id=$1 AND kind='EXPENSE'
  UNION ALL
  SELECT e.id, e.expense_date, s.owed_paise, e.category_id, e.description, 'GROUP'::text, e.group_id
    FROM expense_splits s JOIN expenses e ON e.id=s.expense_id WHERE s.user_id=$1 AND s.owed_paise>0
)`;

export const monthRange = (month) => {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return [`${month}-01`, `${next}-01`];
};

export async function totalForMonth(userId, month) {
  const [from, to] = monthRange(month);
  const r = await query(`${SPEND_CTE} SELECT COALESCE(sum(amt),0)::bigint AS t FROM spend WHERE d >= $2 AND d < $3`, [userId, from, to]);
  return r.rows[0].t;
}
export async function byCategory(userId, month) {
  const [from, to] = monthRange(month);
  return (await query(`${SPEND_CTE}
    SELECT s.cat AS category_id, COALESCE(c.name,'Uncategorised') AS name, sum(s.amt)::bigint AS total
    FROM spend s LEFT JOIN categories c ON c.id=s.cat WHERE s.d >= $2 AND s.d < $3
    GROUP BY s.cat, c.name ORDER BY total DESC`, [userId, from, to])).rows;
}
export async function monthlyTotals(userId, fromMonth, toMonthExclusive) {
  return (await query(`${SPEND_CTE}
    SELECT to_char(date_trunc('month', d),'YYYY-MM') AS month, sum(amt)::bigint AS total
    FROM spend WHERE d >= $2 AND d < $3 GROUP BY 1 ORDER BY 1`, [userId, `${fromMonth}-01`, `${toMonthExclusive}-01`])).rows;
}
export async function largest(userId, month, limit = 5) {
  const [from, to] = monthRange(month);
  return (await query(`${SPEND_CTE}
    SELECT s.id, s.d AS date, s.amt AS amount, s.description, s.src AS source, COALESCE(c.name,'Uncategorised') AS category
    FROM spend s LEFT JOIN categories c ON c.id=s.cat WHERE s.d >= $2 AND s.d < $3 ORDER BY s.amt DESC, s.d DESC LIMIT $4`,
    [userId, from, to, limit])).rows;
}
