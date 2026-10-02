import { query } from "../lib/db/pool.js";

export async function upsert(userId, month, categoryId, limitPaise) {
  const m = `${month}-01`;
  if (categoryId) {
    await query(`INSERT INTO budgets (user_id,month,category_id,limit_paise) VALUES ($1,$2,$3,$4)
      ON CONFLICT (user_id,month,category_id) WHERE category_id IS NOT NULL DO UPDATE SET limit_paise=EXCLUDED.limit_paise`, [userId, m, categoryId, limitPaise]);
  } else {
    await query(`INSERT INTO budgets (user_id,month,category_id,limit_paise) VALUES ($1,$2,NULL,$3)
      ON CONFLICT (user_id,month) WHERE category_id IS NULL DO UPDATE SET limit_paise=EXCLUDED.limit_paise`, [userId, m, limitPaise]);
  }
}
export const listMonth = async (userId, month) =>
  (await query(`SELECT b.*, c.name AS category_name FROM budgets b LEFT JOIN categories c ON c.id=b.category_id
    WHERE b.user_id=$1 AND b.month=$2 ORDER BY c.name NULLS FIRST`, [userId, `${month}-01`])).rows;
export const removeOwn = async (userId, id) => (await query("DELETE FROM budgets WHERE id=$1 AND user_id=$2", [id, userId])).rowCount;
export async function setIncome(userId, month, incomePaise) {
  await query(`INSERT INTO monthly_income (user_id,month,income_paise) VALUES ($1,$2,$3)
    ON CONFLICT (user_id,month) DO UPDATE SET income_paise=EXCLUDED.income_paise`, [userId, `${month}-01`, incomePaise]);
}
export const getIncome = async (userId, month) =>
  (await query("SELECT income_paise FROM monthly_income WHERE user_id=$1 AND month=$2", [userId, `${month}-01`])).rows[0]?.income_paise ?? null;
