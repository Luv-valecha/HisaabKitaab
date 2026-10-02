import { route, ok, readJson } from "@/lib/api/handler";
import * as friends from "@/services/friendService";
export const GET = route(async ({ userId, query }) => ok({ users: await friends.search(userId, query.q) }));
