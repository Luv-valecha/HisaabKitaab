import { route, ok, readJson } from "@/lib/api/handler";
import * as groups from "@/services/groupService";
export const DELETE = route(async ({ userId, params }) => { await groups.removeMember(userId, params.id, params.userId); return ok({ removed: true }); });
