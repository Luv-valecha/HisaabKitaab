import { query } from "../lib/db/pool.js";

/** dedupeKey makes creation idempotent (e.g. "budget80:2026-10:food"). */
export async function create({ userId, type, message, data = {}, dedupeKey = null }, db = { query }) {
  await db.query(
    `INSERT INTO notifications (user_id,type,message,data,dedupe_key) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING`,
    [userId, type, message, data, dedupeKey]);
}
export const list = async (userId, limit = 50) =>
  (await query("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2", [userId, limit])).rows;
export const unreadCount = async (userId) =>
  (await query("SELECT count(*)::int AS n FROM notifications WHERE user_id=$1 AND read_at IS NULL", [userId])).rows[0].n;
export const markAllRead = async (userId) =>
  query("UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL", [userId]);
export const markRead = async (userId, id) =>
  query("UPDATE notifications SET read_at=now() WHERE user_id=$1 AND id=$2", [userId, id]);
