import { route, ok, readJson } from "@/lib/api/handler";
import * as repo from "@/repositories/notifications";
export const POST = route(async ({ userId }) => { await repo.markAllRead(userId); return ok({ done: true }); });
