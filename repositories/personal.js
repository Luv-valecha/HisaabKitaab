import { query } from "../lib/db/pool.js";

const SEL = `SELECT t.*, c.name AS category_name FROM personal_transactions t LEFT JOIN categories c ON c.id=t.category_id`;
export const insert = async (userId, t, db = { query }) =>
  (await db.query(`INSERT INTO personal_transactions (user_id,kind,amount_paise,description,category_id,txn_date,notes,recurring_id,occurrence_date)
    VALUES ($1,$2,$3,$4,$5,COALESCE($6::date,CURRENT_DATE),$7,$8,$9) RETURNING id`,
    [userId, t.kind, t.amountPaise, t.description, t.categoryId ?? null, t.date ?? null, t.notes ?? null, t.recurringId ?? null, t.occurrenceDate ?? null])).rows[0].id;
export const findOwn = async (userId, id) => (await query(`${SEL} WHERE t.id=$1 AND t.user_id=$2`, [id, userId])).rows[0];
export const update = async (userId, id, t) =>
  (await query(`UPDATE personal_transactions SET kind=$3, amount_paise=$4, description=$5, category_id=$6,
    txn_date=COALESCE($7::date,txn_date), notes=$8 WHERE id=$1 AND user_id=$2`,
    [id, userId, t.kind, t.amountPaise, t.description, t.categoryId ?? null, t.date ?? null, t.notes ?? null])).rowCount;
export const remove = async (userId, id) => (await query("DELETE FROM personal_transactions WHERE id=$1 AND user_id=$2", [id, userId])).rowCount;
export const listMonth = async (userId, from, to) =>
  (await query(`${SEL} WHERE t.user_id=$1 AND t.txn_date >= $2 AND t.txn_date < $3 ORDER BY t.txn_date DESC, t.created_at DESC`, [userId, from, to])).rows;
export const incomeForMonth = async (userId, from, to) =>
  (await query(`SELECT COALESCE(sum(amount_paise),0)::bigint AS t FROM personal_transactions WHERE user_id=$1 AND kind='INCOME' AND txn_date >= $2 AND txn_date < $3`, [userId, from, to])).rows[0].t;
