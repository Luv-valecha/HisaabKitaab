import { query } from "../lib/db/pool.js";

export const orderPair = (x, y) => (x < y ? [x, y] : [y, x]);

export async function findBetween(x, y) {
  const [a, b] = orderPair(x, y);
  return (await query("SELECT * FROM friendships WHERE user_a=$1 AND user_b=$2", [a, b])).rows[0];
}
export async function create(requesterId, otherId) {
  const [a, b] = orderPair(requesterId, otherId);
  return (await query(`INSERT INTO friendships (user_a,user_b,requester_id) VALUES ($1,$2,$3) RETURNING *`, [a, b, requesterId])).rows[0];
}
export const findById = async (id) => (await query("SELECT * FROM friendships WHERE id=$1", [id])).rows[0];
export const accept = async (id) => (await query("UPDATE friendships SET status='ACCEPTED' WHERE id=$1 RETURNING *", [id])).rows[0];
export const remove = async (id) => query("DELETE FROM friendships WHERE id=$1", [id]);

export async function listFriends(userId) {
  return (await query(
    `SELECT f.id AS friendship_id, u.* FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.user_a=$1 THEN f.user_b ELSE f.user_a END
     WHERE (f.user_a=$1 OR f.user_b=$1) AND f.status='ACCEPTED' ORDER BY u.display_name`, [userId])).rows;
}
export async function listRequests(userId) {
  return (await query(
    `SELECT f.id AS friendship_id, f.requester_id, f.created_at, u.* FROM friendships f
     JOIN users u ON u.id = f.requester_id
     WHERE (f.user_a=$1 OR f.user_b=$1) AND f.status='PENDING' ORDER BY f.created_at DESC`, [userId])).rows;
}
export async function areFriends(x, y) {
  const f = await findBetween(x, y);
  return f?.status === "ACCEPTED";
}
