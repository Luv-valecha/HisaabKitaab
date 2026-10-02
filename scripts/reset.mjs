// DEV ONLY: wipes ALL data in the database named by DATABASE_URL. Usage: npm run db:reset -- --yes
import pg from "pg";
if (!process.argv.includes("--yes")) { console.error("This deletes everything. Re-run with:  npm run db:reset -- --yes"); process.exit(1); }
if (process.env.NODE_ENV === "production") { console.error("Refusing to run in production."); process.exit(1); }
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
await c.connect();
await c.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
await c.end();
console.log("Database wiped. Now run: npm run db:migrate && npm run db:seed");
