import { route, ok, readJson } from "@/lib/api/handler";
import * as repo from "@/repositories/notifications";
export const GET = route(async ({ userId }) => ok({
  unread: await repo.unreadCount(userId),
  notifications: (await repo.list(userId)).map((n) => ({ id: n.id, type: n.type, message: n.message, data: n.data, read: !!n.read_at, createdAt: n.created_at })),
}));
