import { route, ok, readJson } from "@/lib/api/handler";
import { z } from "zod";
import * as friends from "@/services/friendService";
export const POST = route(async ({ request, userId }) => {
  const { username } = z.object({ username: z.string().trim().min(1) }).parse(await readJson(request));
  return ok(await friends.sendRequest(userId, username), 201);
});
