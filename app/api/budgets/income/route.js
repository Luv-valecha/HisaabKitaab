import { route, ok, readJson } from "@/lib/api/handler";
import { incomeSchema } from "@/lib/validation/schemas";
import * as budgets from "@/services/budgetService";
export const PUT = route(async ({ request, userId }) => ok(await budgets.setIncome(userId, incomeSchema.parse(await readJson(request)))));
