import { query } from "../lib/db/pool.js";

export const insert = async (r) => (await query(
  `INSERT INTO recurring_rules (user_id,target,frequency,start_date,next_run,end_date,description,amount_paise,category_id,group_id,split_template)
   VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
  [r.userId, r.target, r.frequency, r.startDate, r.endDate ?? null, r.description, r.amountPaise, r.categoryId ?? null, r.groupId ?? null, r.splitTemplate ?? null])).rows[0];
export const listForUser = async (userId) =>
  (await query("SELECT * FROM recurring_rules WHERE user_id=$1 ORDER BY created_at DESC", [userId])).rows;
export const findOwn = async (userId, id) => (await query("SELECT * FROM recurring_rules WHERE id=$1 AND user_id=$2", [id, userId])).rows[0];
export const setActive = async (userId, id, active) =>
  (await query("UPDATE recurring_rules SET active=$3 WHERE id=$1 AND user_id=$2", [id, userId, active])).rowCount;
export const removeOwn = async (userId, id) => (await query("DELETE FROM recurring_rules WHERE id=$1 AND user_id=$2", [id, userId])).rowCount;
export const dueIds = async (today) =>
  (await query("SELECT id FROM recurring_rules WHERE active AND next_run <= $1 ORDER BY next_run", [today])).rows.map((r) => r.id);
/** Row-locks the rule so two concurrent runners can't process it twice. */
export const lockById = async (db, id) =>
  (await db.query("SELECT * FROM recurring_rules WHERE id=$1 FOR UPDATE", [id])).rows[0];
export const advance = async (db, id, next, active) =>
  db.query("UPDATE recurring_rules SET next_run=$2, active=$3 WHERE id=$1", [id, next, active]);
