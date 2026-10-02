import { route, ok, readJson } from "@/lib/api/handler";
import * as settlements from "@/services/settlementService";
export const GET = route(async ({ userId }) => ok({ settlements: await settlements.listMine(userId) }));
