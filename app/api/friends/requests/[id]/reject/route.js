import { route, ok, readJson } from "@/lib/api/handler";
import * as friends from "@/services/friendService";
export const POST = route(async ({ userId, params }) => { await friends.removeFriendship(userId, params.id); return ok({ rejected: true }); });
