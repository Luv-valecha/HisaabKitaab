import { route, ok } from "@/lib/api/handler";
import * as direct from "@/services/directService";

export const GET = route(async ({ userId, params }) => ok(await direct.ledger(userId, params.userId)));
