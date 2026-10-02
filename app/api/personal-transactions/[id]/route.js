import { route, ok, readJson } from "@/lib/api/handler";
import { personalTxnSchema } from "@/lib/validation/schemas";
import * as personal from "@/services/personalService";
export const PUT = route(async ({ request, userId, params }) => ok({ transaction: await personal.update(userId, params.id, personalTxnSchema.parse(await readJson(request))) }));
export const DELETE = route(async ({ userId, params }) => { await personal.remove(userId, params.id); return ok({ deleted: true }); });
