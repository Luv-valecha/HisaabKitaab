import { route, ok, readJson } from "@/lib/api/handler";
import { expenseSchema } from "@/lib/validation/schemas";
import * as expenses from "@/services/expenseService";

// Split an expense directly with friends (no group).
export const POST = route(async ({ request, userId }) =>
  ok({ expense: await expenses.createDirect(userId, expenseSchema.parse(await readJson(request))) }, 201));
