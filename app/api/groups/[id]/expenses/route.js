import { route, ok, readJson } from "@/lib/api/handler";
import { expenseSchema } from "@/lib/validation/schemas";
import * as expenses from "@/services/expenseService";
export const GET = route(async ({ userId, params }) => ok({ expenses: await expenses.listForGroup(userId, params.id) }));
export const POST = route(async ({ request, userId, params }) =>
  ok({ expense: await expenses.create(userId, params.id, expenseSchema.parse(await readJson(request))) }, 201));
