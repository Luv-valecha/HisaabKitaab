import { route, ok, readJson } from "@/lib/api/handler";
import { groupSchema } from "@/lib/validation/schemas";
import * as groups from "@/services/groupService";
export const GET = route(async ({ userId }) => ok({ groups: await groups.list(userId) }));
export const POST = route(async ({ request, userId }) => ok({ group: await groups.create(userId, groupSchema.parse(await readJson(request))) }, 201));
