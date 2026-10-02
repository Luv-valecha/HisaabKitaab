import crypto from "node:crypto";
import { route, ok } from "@/lib/api/handler";
import { AppError } from "@/lib/api/errors";
import { runDue } from "@/services/recurringService";
function authorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
// Vercel Cron issues GET with "Authorization: Bearer $CRON_SECRET"; POST is allowed for other schedulers.
const handler = route(async ({ request }) => {
  if (!authorized(request)) throw new AppError(401, "UNAUTHORIZED", "Invalid cron secret");
  return ok(await runDue());
}, { auth: false });
export const GET = handler;
export const POST = handler;
