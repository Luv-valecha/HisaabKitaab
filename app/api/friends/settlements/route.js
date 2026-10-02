import { route, ok, readJson } from "@/lib/api/handler";
import { settlementSchema } from "@/lib/validation/schemas";
import * as direct from "@/services/directService";

export const POST = route(async ({ request, userId }) =>
  ok({ settlement: await direct.recordSettlement(userId, settlementSchema.parse(await readJson(request))) }, 201));
