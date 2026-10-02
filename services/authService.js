import bcrypt from "bcryptjs";
import * as users from "../repositories/users.js";
import { signSession } from "../lib/auth/session.js";
import { AppError, conflict } from "../lib/api/errors.js";

const COST = 12;
// Constant-time-ish dummy hash so unknown users and wrong passwords take similar time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", COST);

export async function register({ username, email, displayName, password }) {
  if (await users.findByUsername(username)) throw conflict("That username is taken");
  const passwordHash = await bcrypt.hash(password, COST);
  try {
    const user = await users.create({ username, email, displayName, passwordHash });
    return { user: users.toSelfDto(user), token: await signSession(user.id) };
  } catch (e) {
    if (e.code === "23505") throw conflict("That username or email is already registered");
    throw e;
  }
}

export async function login({ identifier, password }) {
  const user = await users.findByIdentifier(identifier);
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, "INVALID_CREDENTIALS", "Wrong username or password");
  return { user: users.toSelfDto(user), token: await signSession(user.id) };
}

export async function me(userId) {
  const user = await users.findById(userId);
  if (!user) throw new AppError(401, "UNAUTHORIZED", "Please log in to continue");
  return users.toSelfDto(user);
}
