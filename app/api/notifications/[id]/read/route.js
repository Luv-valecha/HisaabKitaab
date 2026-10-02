import { route, ok, readJson } from "@/lib/api/handler";
import * as repo from "@/repositories/notifications";
export const POST = route(async ({ userId, params }) => { await repo.markRead(userId, params.id); return ok({ done: true }); });
