// Starts a throwaway local PostgreSQL (no installer needed). Usage: npm run db:local
// Data lives in ./.pgdata. Press Ctrl+C to stop. Connection string it serves:
//   postgres://hisaab:hisaab@localhost:5432/hisaabkitaab
import fs from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const dir = ".pgdata";
const fresh = !fs.existsSync(dir);
const pgdb = new EmbeddedPostgres({ databaseDir: dir, user: "hisaab", password: "hisaab", port: 5432, persistent: true, createPostgresUser: process.getuid?.() === 0 });
if (fresh) await pgdb.initialise();
await pgdb.start();
if (fresh) await pgdb.createDatabase("hisaabkitaab");
console.log("PostgreSQL ready: postgres://hisaab:hisaab@localhost:5432/hisaabkitaab  (Ctrl+C to stop)");
const stop = async () => { await pgdb.stop(); process.exit(0); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
