import { route, ok, readJson } from "@/lib/api/handler";
import { groupSchema } from "@/lib/validation/schemas";
import * as groups from "@/services/groupService";
export const GET = route(async ({ userId, params }) => ok({ group: await groups.get(userId, params.id) }));
export const PATCH = route(async ({ request, userId, params }) => ok({ group: await groups.update(userId, params.id, groupSchema.parse(await readJson(request))) }));
export const DELETE = route(async ({ userId, params }) => { await groups.remove(userId, params.id); return ok({ deleted: true }); });
