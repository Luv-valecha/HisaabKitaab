import { route, ok, readJson } from "@/lib/api/handler";
import * as friends from "@/services/friendService";
export const DELETE = route(async ({ userId, params }) => { await friends.removeFriendship(userId, params.id); return ok({ removed: true }); });
