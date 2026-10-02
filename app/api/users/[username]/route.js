import { route, ok, readJson } from "@/lib/api/handler";
import * as friends from "@/services/friendService";
export const GET = route(async ({ userId, params }) => ok({ user: await friends.profile(userId, params.username) }));
