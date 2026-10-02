import { query } from "../lib/db/pool.js";

// DTO mapping: never expose password_hash.
export const toUserDto = (r) => r && ({ id: r.id, username: r.username, displayName: r.display_name, theme: r.theme });
export const toSelfDto = (r) => r && ({ ...toUserDto(r), email: r.email, createdAt: r.created_at });

export async function create({ username, email, displayName, passwordHash }, db = { query }) {
  const { rows } = await db.query(
    `INSERT INTO users (username, email, display_name, password_hash) VALUES ($1,$2,$3,$4) RETURNING *`,
    [username, email, displayName, passwordHash]);
  return rows[0];
}
export const findById = async (id) => (await query("SELECT * FROM users WHERE id=$1", [id])).rows[0];
export const findByIdentifier = async (v) =>
  (await query("SELECT * FROM users WHERE username=$1 OR lower(email)=$1", [v])).rows[0];
export const findByUsername = async (u) => (await query("SELECT * FROM users WHERE username=$1", [u])).rows[0];
export const searchByUsername = async (prefix, excludeId, limit = 10) =>
  (await query(`SELECT * FROM users WHERE username LIKE $1 AND id <> $2 ORDER BY username LIMIT $3`,
    [prefix.replace(/[%_\\]/g, "\\$&") + "%", excludeId, limit])).rows;
export const setTheme = async (id, theme) =>
  (await query("UPDATE users SET theme=$2 WHERE id=$1 RETURNING *", [id, theme])).rows[0];
