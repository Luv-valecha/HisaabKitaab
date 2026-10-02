import { SignJWT, jwtVerify } from "jose";
import { unauthorized } from "../api/errors.js";

export const COOKIE_NAME = "hk_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error("JWT_SECRET must be set (16+ chars). See .env.example");
  return new TextEncoder().encode(s);
}

export async function signSession(userId) {
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(userId)
    .setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch { return null; }
}

export function sessionCookie(token) {
  return { name: COOKIE_NAME, value: token, httpOnly: true, sameSite: "lax", path: "/",
    secure: process.env.NODE_ENV === "production", maxAge: MAX_AGE };
}
export const clearedCookie = () => ({ name: COOKIE_NAME, value: "", httpOnly: true, sameSite: "lax", path: "/",
  secure: process.env.NODE_ENV === "production", maxAge: 0 });

/** Returns the authenticated user id or throws 401. */
export async function requireUserId(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const id = token ? await verifySession(token) : null;
  if (!id) throw unauthorized();
  return id;
}
