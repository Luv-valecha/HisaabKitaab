import { query } from "../lib/db/pool.js";
import * as expensesRepo from "./expenses.js";

/** Net with every other person across all NON-group records. net > 0 = they owe me. Mirrors lib/calculations/pairBalance.js. */
export async function friendNets(userId) {
  return (await query(
    `SELECT u.id AS user_id, u.username, u.display_name, d.net::bigint AS net
     FROM (
       SELECT other, sum(delta) AS net FROM (
         SELECT s.user_id AS other,  s.owed_paise AS delta FROM expenses e JOIN expense_splits s ON s.expense_id=e.id
           WHERE e.group_id IS NULL AND e.paid_by=$1 AND s.user_id<>$1
         UNION ALL
         SELECT e.paid_by AS other, -s.owed_paise AS delta FROM expenses e JOIN expense_splits s ON s.expense_id=e.id
           WHERE e.group_id IS NULL AND s.user_id=$1 AND e.paid_by<>$1
         UNION ALL
         SELECT from_user AS other, -amount_paise AS delta FROM settlements WHERE group_id IS NULL AND to_user=$1
         UNION ALL
         SELECT to_user AS other,   amount_paise AS delta FROM settlements WHERE group_id IS NULL AND from_user=$1
       ) x GROUP BY other
     ) d JOIN users u ON u.id = d.other
     WHERE d.net <> 0 ORDER BY u.display_name`, [userId])).rows;
}

/** Direct expenses where one of the two paid and the other shares it. */
export async function expensesBetween(a, b) {
  const ids = (await query(
    `SELECT e.id FROM expenses e WHERE e.group_id IS NULL AND (
       (e.paid_by=$1 AND EXISTS (SELECT 1 FROM expense_splits x WHERE x.expense_id=e.id AND x.user_id=$2)) OR
       (e.paid_by=$2 AND EXISTS (SELECT 1 FROM expense_splits x WHERE x.expense_id=e.id AND x.user_id=$1)))
     ORDER BY e.expense_date DESC, e.created_at DESC`, [a, b])).rows.map((r) => r.id);
  return Promise.all(ids.map((id) => expensesRepo.getDetailed(id)));
}

export const settlementsBetween = async (a, b) =>
  (await query(
    `SELECT s.*, fu.display_name AS from_name, fu.username AS from_username, tu.display_name AS to_name, tu.username AS to_username
     FROM settlements s JOIN users fu ON fu.id=s.from_user JOIN users tu ON tu.id=s.to_user
     WHERE s.group_id IS NULL AND ((s.from_user=$1 AND s.to_user=$2) OR (s.from_user=$2 AND s.to_user=$1))
     ORDER BY s.settled_at DESC`, [a, b])).rows;
