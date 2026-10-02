import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, forbidden } from "./errors.js";
import { requireUserId } from "../auth/session.js";
import { MoneyError } from "../calculations/money.js";

export const ok = (data, status = 200) => NextResponse.json({ data }, { status });
export const fail = (status, code, message, details) =>
  NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });

/**
 * CSRF defence for cookie auth, layered with SameSite=Lax:
 * browsers always send Origin on cross-site unsafe requests, so a mismatch is rejected.
 */
function assertSameOrigin(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (new URL(origin).host !== host) throw forbidden("Cross-origin request blocked");
}

/**
 * Wrap a route handler: auth, CSRF, error mapping to a consistent JSON shape.
 * handler receives ({ request, userId, params, query }).
 */
export function route(handler, { auth = true } = {}) {
  return async (request, ctx) => {
    try {
      assertSameOrigin(request);
      const userId = auth ? await requireUserId(request) : null;
      const params = ctx?.params ? await ctx.params : {};
      const query = Object.fromEntries(new URL(request.url).searchParams);
      return await handler({ request, userId, params, query });
    } catch (e) {
      if (e instanceof AppError) return fail(e.status, e.code, e.message, e.details);
      if (e instanceof ZodError) {
        return fail(400, "VALIDATION_ERROR", "Please check the highlighted fields",
          e.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
      }
      if (e instanceof MoneyError) return fail(400, "BAD_REQUEST", e.message);
      if (e?.code === "23505") return fail(409, "CONFLICT", "That already exists");
      if (e?.code === "22P02") return fail(400, "BAD_REQUEST", "Invalid identifier");
      console.error(e);
      return fail(500, "INTERNAL", "Something went wrong on our side. Please try again.");
    }
  };
}

export async function readJson(request) {
  try { return await request.json(); } catch { throw new AppError(400, "BAD_REQUEST", "Request body must be valid JSON"); }
}
