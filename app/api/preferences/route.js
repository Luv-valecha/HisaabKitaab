import { route, ok, readJson } from "@/lib/api/handler";
import { themeSchema } from "@/lib/validation/schemas";
import * as users from "@/repositories/users";
export const GET = route(async ({ userId }) => ok({ theme: (await users.findById(userId)).theme }));
export const PUT = route(async ({ request, userId }) => { const { theme } = themeSchema.parse(await readJson(request)); await users.setTheme(userId, theme); return ok({ theme }); });
