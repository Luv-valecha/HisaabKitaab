import { route, ok, readJson } from "@/lib/api/handler";
import { categorySchema } from "@/lib/validation/schemas";
import * as categories from "@/repositories/categories";
export const GET = route(async ({ userId }) => ok({ categories: (await categories.listForUser(userId)).map((c) => ({ id: c.id, name: c.name, kind: c.kind, custom: !!c.user_id })) }));
export const POST = route(async ({ request, userId }) => { const c = await categories.create(userId, categorySchema.parse(await readJson(request))); return ok({ category: { id: c.id, name: c.name, kind: c.kind, custom: true } }, 201); });
