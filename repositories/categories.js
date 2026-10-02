import { query } from "../lib/db/pool.js";

export const listForUser = async (userId) =>
  (await query("SELECT * FROM categories WHERE user_id IS NULL OR user_id=$1 ORDER BY kind, name", [userId])).rows;
export const findVisible = async (id, userId) =>
  (await query("SELECT * FROM categories WHERE id=$1 AND (user_id IS NULL OR user_id=$2)", [id, userId])).rows[0];
export const create = async (userId, { name, kind }) =>
  (await query("INSERT INTO categories (user_id,name,kind) VALUES ($1,$2,$3) RETURNING *", [userId, name, kind])).rows[0];
export const removeOwn = async (userId, id) =>
  (await query("DELETE FROM categories WHERE id=$1 AND user_id=$2", [id, userId])).rowCount;
