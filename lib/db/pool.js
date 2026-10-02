import pg from "pg";

// pg returns BIGINT as string by default; our paise values are always < 2^53, so parse to Number.
pg.types.setTypeParser(20, (v) => Number(v));
// Keep DATE columns as plain 'YYYY-MM-DD' strings (avoids timezone shifts).
pg.types.setTypeParser(1082, (v) => v);

const globalForPg = globalThis;

export function getPool() {
  if (!globalForPg.__hkPool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    globalForPg.__hkPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
  }
  return globalForPg.__hkPool;
}

export const query = (text, params) => getPool().query(text, params);

/** Run fn(client) inside a transaction. Rolls back on any thrown error. */
export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
