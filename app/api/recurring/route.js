import { route, ok, readJson } from "@/lib/api/handler";
import { recurringSchema } from "@/lib/validation/schemas";
import * as recurring from "@/services/recurringService";
export const GET = route(async ({ userId }) => ok({ rules: await recurring.list(userId) }));
export const POST = route(async ({ request, userId }) => ok({ rule: await recurring.create(userId, recurringSchema.parse(await readJson(request))) }, 201));
