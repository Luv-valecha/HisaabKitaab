import { route, ok, readJson } from "@/lib/api/handler";
import { query } from "@/lib/db/pool";
export const GET = route(async () => { await query("SELECT 1"); return ok({ status: "ok" }); }, { auth: false });
