// Applies database/migrations/*.sql in order, once each. Usage: npm run db:migrate
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set (see .env.example)"); process.exit(1); }

const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
const client = new pg.Client({ connectionString: url, ssl });
await client.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const dir = path.resolve("database/migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
  for (const f of files) {
    if (done.has(f)) { console.log(`skip   ${f}`); continue; }
    await client.query("BEGIN");
    try {
      await client.query(fs.readFileSync(path.join(dir, f), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [f]);
      await client.query("COMMIT");
      console.log(`apply  ${f}`);
    } catch (e) { await client.query("ROLLBACK"); console.error(`FAILED ${f}:`, e.message); process.exit(1); }
  }
  console.log("Migrations up to date.");
} finally { await client.end(); }
