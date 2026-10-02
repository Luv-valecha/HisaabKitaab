import { route, ok, readJson } from "@/lib/api/handler";
import { z } from "zod";
import * as recurring from "@/services/recurringService";
export const PATCH = route(async ({ request, userId, params }) => { const { active } = z.object({ active: z.boolean() }).parse(await readJson(request)); await recurring.setActive(userId, params.id, active); return ok({ active }); });
export const DELETE = route(async ({ userId, params }) => { await recurring.remove(userId, params.id); return ok({ deleted: true }); });
