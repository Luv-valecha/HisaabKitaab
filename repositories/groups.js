import { query } from "../lib/db/pool.js";

export async function create({ name, description, createdBy }, db) {
  const g = (await db.query(`INSERT INTO groups (name,description,created_by) VALUES ($1,$2,$3) RETURNING *`,
    [name, description ?? null, createdBy])).rows[0];
  await db.query(`INSERT INTO group_members (group_id,user_id,role) VALUES ($1,$2,'OWNER')`, [g.id, createdBy]);
  return g;
}
export const findById = async (id) => (await query("SELECT * FROM groups WHERE id=$1", [id])).rows[0];
export const update = async (id, { name, description }) =>
  (await query("UPDATE groups SET name=$2, description=$3 WHERE id=$1 RETURNING *", [id, name, description ?? null])).rows[0];
export const remove = async (id) => query("DELETE FROM groups WHERE id=$1", [id]);

export async function listForUser(userId) {
  return (await query(
    `SELECT g.*, (SELECT count(*) FROM group_members m2 WHERE m2.group_id=g.id)::int AS member_count
     FROM groups g JOIN group_members m ON m.group_id=g.id AND m.user_id=$1 ORDER BY g.created_at DESC`, [userId])).rows;
}
export const getMember = async (groupId, userId, db = { query }) =>
  (await db.query("SELECT * FROM group_members WHERE group_id=$1 AND user_id=$2", [groupId, userId])).rows[0];
export async function listMembers(groupId, db = { query }) {
  return (await db.query(
    `SELECT u.*, m.role FROM group_members m JOIN users u ON u.id=m.user_id WHERE m.group_id=$1 ORDER BY u.display_name`, [groupId])).rows;
}
export const addMember = async (groupId, userId) =>
  query("INSERT INTO group_members (group_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [groupId, userId]);
export const removeMember = async (groupId, userId) =>
  query("DELETE FROM group_members WHERE group_id=$1 AND user_id=$2", [groupId, userId]);
