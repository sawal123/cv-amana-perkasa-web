import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export { hashPassword, verifyPassword } from "./password";

export const SESSION_COOKIE = "amana_admin";
const SESSION_DAYS = 7;
const ISSUER = "amana-perkasa-admin";

export type Session = { userId: number; username: string };

let secretWarned = false;

function signingSecret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    // Without this, getSession's catch-all would swallow the misconfiguration and
    // every admin login would fail silently — the site looks fine while the panel
    // is permanently unreachable. Say it out loud so it reaches stderr.log.
    if (!secretWarned) {
      secretWarned = true;
      console.error(
        "[auth] AUTH_SECRET missing or shorter than 32 characters. " +
          "Admin sessions cannot be signed or verified. Set it in cPanel Environment Variables " +
          "(generate with: openssl rand -base64 48).",
      );
    }
    throw new Error("AUTH_SECRET misconfigured");
  }
  return new TextEncoder().encode(value);
}

/** Lets callers report a misconfigured secret instead of crashing a server action. */
export function authSecretReady(): boolean {
  return typeof process.env.AUTH_SECRET === "string" && process.env.AUTH_SECRET.length >= 32;
}

export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ username: session.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(session.userId))
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(signingSecret());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, signingSecret(), { issuer: ISSUER });
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) return null;
    return { userId, username: typeof payload.username === "string" ? payload.username : "" };
  } catch {
    return null;
  }
}

/** Guard for admin pages. Redirects to the login screen when there is no valid session. */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}
