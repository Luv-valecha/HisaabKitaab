import { query } from "../lib/db/pool.js";

export async function insert(db, e) {
  const row = (await db.query(
    `INSERT INTO expenses (group_id,paid_by,created_by,amount_paise,description,category_id,expense_date,notes,split_type,recurring_id,occurrence_date)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::date,CURRENT_DATE),$8,$9,$10,$11) RETURNING *`,
    [e.groupId, e.paidBy, e.createdBy, e.amountPaise, e.description, e.categoryId ?? null, e.date ?? null, e.notes ?? null, e.splitType, e.recurringId ?? null, e.occurrenceDate ?? null])).rows[0];
  return row;
}
export async function update(db, id, e) {
  return (await db.query(
    `UPDATE expenses SET paid_by=$2, amount_paise=$3, description=$4, category_id=$5, expense_date=COALESCE($6::date,expense_date),
       notes=$7, split_type=$8, updated_at=now() WHERE id=$1 RETURNING *`,
    [id, e.paidBy, e.amountPaise, e.description, e.categoryId ?? null, e.date ?? null, e.notes ?? null, e.splitType])).rows[0];
}
export async function replaceSplits(db, expenseId, splits) {
  await db.query("DELETE FROM expense_splits WHERE expense_id=$1", [expenseId]);
  for (const s of splits) await db.query("INSERT INTO expense_splits (expense_id,user_id,owed_paise) VALUES ($1,$2,$3)", [expenseId, s.userId, s.owed]);
}
export const remove = async (id) => query("DELETE FROM expenses WHERE id=$1", [id]);
export const findById = async (id) => (await query("SELECT * FROM expenses WHERE id=$1", [id])).rows[0];

const SELECT = `SELECT e.*, c.name AS category_name, pu.display_name AS paid_by_name, pu.username AS paid_by_username,
  COALESCE(json_agg(json_build_object('userId', s.user_id, 'owed', s.owed_paise, 'name', su.display_name, 'username', su.username)
    ORDER BY su.display_name) FILTER (WHERE s.user_id IS NOT NULL), '[]') AS splits
  FROM expenses e
  JOIN users pu ON pu.id = e.paid_by
  LEFT JOIN categories c ON c.id = e.category_id
  LEFT JOIN expense_splits s ON s.expense_id = e.id
  LEFT JOIN users su ON su.id = s.user_id`;
const GROUP_BY = `GROUP BY e.id, c.name, pu.display_name, pu.username`;

export const listByGroup = async (groupId) =>
  (await query(`${SELECT} WHERE e.group_id=$1 ${GROUP_BY} ORDER BY e.expense_date DESC, e.created_at DESC`, [groupId])).rows;
export const getDetailed = async (id) =>
  (await query(`${SELECT} WHERE e.id=$1 ${GROUP_BY}`, [id])).rows[0];

/** Minimal records used for balance math. */
export async function ledgerForGroup(groupId, db = { query }) {
  const ex = (await db.query(
    `SELECT e.id, e.paid_by, COALESCE(json_agg(json_build_object('userId', s.user_id, 'owed', s.owed_paise)) FILTER (WHERE s.user_id IS NOT NULL),'[]') AS splits
     FROM expenses e LEFT JOIN expense_splits s ON s.expense_id=e.id WHERE e.group_id=$1 GROUP BY e.id`, [groupId])).rows
    .map((r) => ({ paidBy: r.paid_by, splits: r.splits }));
  const st = (await db.query("SELECT from_user, to_user, amount_paise FROM settlements WHERE group_id=$1", [groupId])).rows
    .map((r) => ({ fromUser: r.from_user, toUser: r.to_user, amount: r.amount_paise }));
  return { expenses: ex, settlements: st };
}
