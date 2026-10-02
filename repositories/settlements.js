import { query } from "../lib/db/pool.js";

export const insert = async (s, db = { query }) =>
  (await db.query(`INSERT INTO settlements (group_id,from_user,to_user,amount_paise,note,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [s.groupId, s.fromUser, s.toUser, s.amountPaise, s.note ?? null, s.createdBy])).rows[0];
export const listByGroup = async (groupId) =>
  (await query(`SELECT s.*, fu.display_name AS from_name, fu.username AS from_username, tu.display_name AS to_name, tu.username AS to_username
    FROM settlements s JOIN users fu ON fu.id=s.from_user JOIN users tu ON tu.id=s.to_user
    WHERE s.group_id=$1 ORDER BY s.settled_at DESC`, [groupId])).rows;
export const listForUser = async (userId) =>
  (await query(`SELECT s.*, COALESCE(g.name, 'Between friends') AS group_name, fu.display_name AS from_name, fu.username AS from_username, tu.display_name AS to_name, tu.username AS to_username
    FROM settlements s LEFT JOIN groups g ON g.id=s.group_id JOIN users fu ON fu.id=s.from_user JOIN users tu ON tu.id=s.to_user
    WHERE s.from_user=$1 OR s.to_user=$1 ORDER BY s.settled_at DESC`, [userId])).rows;
