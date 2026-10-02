import { route, ok, readJson } from "@/lib/api/handler";
import * as analytics from "@/services/analyticsService";
export const GET = route(async ({ userId, query }) => ok(await analytics.personal(userId, query.month)));
