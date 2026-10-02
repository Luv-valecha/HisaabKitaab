import { route, ok, readJson } from "@/lib/api/handler";
import * as categories from "@/repositories/categories";
import { notFound } from "@/lib/api/errors";
export const DELETE = route(async ({ userId, params }) => { if (!(await categories.removeOwn(userId, params.id))) throw notFound("Category not found (system categories can't be deleted)"); return ok({ deleted: true }); });
