import { route, ok, readJson } from "@/lib/api/handler";
import * as budgets from "@/services/budgetService";
import { notFound } from "@/lib/api/errors";
export const DELETE = route(async ({ userId, params }) => { if (!(await budgets.removeBudget(userId, params.id))) throw notFound("Budget not found"); return ok({ deleted: true }); });
