import { route, ok, readJson } from "@/lib/api/handler";
import { budgetSchema } from "@/lib/validation/schemas";
import * as budgets from "@/services/budgetService";
import { spendingRange } from "@/services/_range";
export const GET = route(async ({ userId, query }) => { spendingRange(query.month); return ok(await budgets.getMonth(userId, query.month ?? budgets.currentMonth())); });
export const PUT = route(async ({ request, userId }) => ok(await budgets.setBudget(userId, budgetSchema.parse(await readJson(request)))));
