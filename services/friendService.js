import * as users from "../repositories/users.js";
import * as friends from "../repositories/friends.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/api/errors.js";
import { notify } from "../lib/notifications/notify.js";

export async function search(userId, q) {
  if (!q || q.trim().length < 2) return [];
  const rows = await users.searchByUsername(q.trim().toLowerCase(), userId);
  const out = [];
  for (const u of rows) {
    const f = await friends.findBetween(userId, u.id);
    out.push({ ...users.toUserDto(u), relation: !f ? "NONE" : f.status === "ACCEPTED" ? "FRIEND" : f.requester_id === userId ? "REQUEST_SENT" : "REQUEST_RECEIVED" });
  }
  return out;
}

export async function sendRequest(userId, username) {
  const target = await users.findByUsername(username.trim().toLowerCase());
  if (!target) throw notFound("No user with that username");
  if (target.id === userId) throw badRequest("You can't add yourself");
  const existing = await friends.findBetween(userId, target.id);
  if (existing?.status === "ACCEPTED") throw conflict("You're already friends");
  if (existing) {
    if (existing.requester_id === userId) throw conflict("Request already sent");
    // They already asked us: treat as accept.
    await friends.accept(existing.id);
    return { status: "ACCEPTED", friendshipId: existing.id };
  }
  const f = await friends.create(userId, target.id);
  const me = await users.findById(userId);
  await notify({ userId: target.id, type: "FRIEND_REQUEST", message: `${me.display_name} (@${me.username}) sent you a friend request.`, data: { friendshipId: f.id } });
  return { status: "PENDING", friendshipId: f.id };
}

async function loadMine(userId, id) {
  const f = await friends.findById(id);
  if (!f || (f.user_a !== userId && f.user_b !== userId)) throw notFound("Friend request not found");
  return f;
}
export async function acceptRequest(userId, id) {
  const f = await loadMine(userId, id);
  if (f.status !== "PENDING") throw conflict("Already accepted");
  if (f.requester_id === userId) throw forbidden("Only the person who received the request can accept it");
  await friends.accept(id);
  const me = await users.findById(userId);
  await notify({ userId: f.requester_id, type: "FRIEND_ACCEPTED", message: `${me.display_name} accepted your friend request.`, data: {} });
}
/** Used for reject (pending), cancel (pending, requester) and remove friend (accepted). */
export async function removeFriendship(userId, id) {
  await loadMine(userId, id);
  await friends.remove(id);
}
export async function list(userId) {
  const [f, r] = await Promise.all([friends.listFriends(userId), friends.listRequests(userId)]);
  return {
    friends: f.map((u) => ({ friendshipId: u.friendship_id, ...users.toUserDto(u) })),
    incoming: r.filter((x) => x.requester_id !== userId).map((u) => ({ friendshipId: u.friendship_id, ...users.toUserDto(u) })),
    outgoing: r.filter((x) => x.requester_id === userId).map((u) => ({ friendshipId: u.friendship_id, ...users.toUserDto(u) })),
  };
}
export async function profile(viewerId, username) {
  const u = await users.findByUsername(username.toLowerCase());
  if (!u) throw notFound("User not found");
  const f = viewerId === u.id ? null : await friends.findBetween(viewerId, u.id);
  return { ...users.toUserDto(u), isSelf: viewerId === u.id, friendStatus: f?.status ?? "NONE" };
}
