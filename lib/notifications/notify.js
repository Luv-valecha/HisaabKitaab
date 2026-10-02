import * as repo from "../../repositories/notifications.js";

/**
 * Single entry point for creating notifications. Today it writes to the in-app inbox (DB).
 * To add email/push later, add a channel function here and call it from this function.
 */
export async function notify(n, db) {
  await repo.create(n, db);
}
