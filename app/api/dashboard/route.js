import { route, ok, readJson } from "@/lib/api/handler";
import * as analytics from "@/services/analyticsService";
export const GET = route(async ({ userId }) => ok(await analytics.dashboard(userId)));
