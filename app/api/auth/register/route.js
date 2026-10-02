import { route, ok, readJson } from "@/lib/api/handler";
import { registerSchema } from "@/lib/validation/schemas";
import * as auth from "@/services/authService";
import { sessionCookie } from "@/lib/auth/session";
export const POST = route(async ({ request }) => {
  const { user, token } = await auth.register(registerSchema.parse(await readJson(request)));
  const res = ok({ user }, 201); res.cookies.set(sessionCookie(token)); return res;
}, { auth: false });
