import { route, ok, readJson } from "@/lib/api/handler";
import * as balances from "@/services/balanceService";
export const GET = route(async ({ userId, params }) => ok(await balances.groupBalances(userId, params.id)));
