import { route, ok, readJson } from "@/lib/api/handler";
import { loginSchema } from "@/lib/validation/schemas";
import * as auth from "@/services/authService";
import { sessionCookie } from "@/lib/auth/session";
export const POST = route(async ({ request }) => {
  const { user, token } = await auth.login(loginSchema.parse(await readJson(request)));
  const res = ok({ user }); res.cookies.set(sessionCookie(token)); return res;
}, { auth: false });
