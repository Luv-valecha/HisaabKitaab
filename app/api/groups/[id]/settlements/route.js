import { route, ok, readJson } from "@/lib/api/handler";
import { settlementSchema } from "@/lib/validation/schemas";
import * as settlements from "@/services/settlementService";
export const GET = route(async ({ userId, params }) => ok({ settlements: await settlements.listForGroup(userId, params.id) }));
export const POST = route(async ({ request, userId, params }) =>
  ok({ settlement: await settlements.record(userId, params.id, settlementSchema.parse(await readJson(request))) }, 201));
