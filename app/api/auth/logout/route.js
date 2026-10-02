import { route, ok, readJson } from "@/lib/api/handler";
import { clearedCookie } from "@/lib/auth/session";
export const POST = route(async () => { const res = ok({ loggedOut: true }); res.cookies.set(clearedCookie()); return res; }, { auth: false });
