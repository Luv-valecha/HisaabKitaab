import { route, ok, readJson } from "@/lib/api/handler";
import { personalTxnSchema } from "@/lib/validation/schemas";
import * as personal from "@/services/personalService";
export const GET = route(async ({ userId, query }) => ok({ transactions: await personal.list(userId, query.month) }));
export const POST = route(async ({ request, userId }) => ok({ transaction: await personal.create(userId, personalTxnSchema.parse(await readJson(request))) }, 201));
