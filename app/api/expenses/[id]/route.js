import { route, ok, readJson } from "@/lib/api/handler";
import { expenseSchema } from "@/lib/validation/schemas";
import * as expenses from "@/services/expenseService";
export const GET = route(async ({ userId, params }) => ok({ expense: await expenses.get(userId, params.id) }));
export const PUT = route(async ({ request, userId, params }) => ok({ expense: await expenses.update(userId, params.id, expenseSchema.parse(await readJson(request))) }));
export const DELETE = route(async ({ userId, params }) => { await expenses.remove(userId, params.id); return ok({ deleted: true }); });
