import { route, ok, readJson } from "@/lib/api/handler";
import { addMemberSchema } from "@/lib/validation/schemas";
import * as groups from "@/services/groupService";
export const POST = route(async ({ request, userId, params }) => {
  await groups.addMember(userId, params.id, addMemberSchema.parse(await readJson(request)).userId);
  return ok({ group: await groups.get(userId, params.id) }, 201);
});
