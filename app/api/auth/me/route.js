import { route, ok, readJson } from "@/lib/api/handler";
import * as auth from "@/services/authService";
export const GET = route(async ({ userId }) => ok({ user: await auth.me(userId) }));
