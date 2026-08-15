import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { rpc } from "./supabase";

const ADMIN_COOKIE = "verno_admin";
const STUDENT_COOKIE = "verno_student";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7;

export function hashToken(token: string) {
  const secret = process.env.SESSION_SECRET || "dev-secret";
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function createAdminSession() {
  const token = nanoid(32);
  const expires = new Date(Date.now() + SESSION_TTL_SEC * 1000).toISOString();
  await rpc("verno4u_put_session", {
    p_token_hash: hashToken(token),
    p_kind: "admin",
    p_student_id: null,
    p_expires_at: expires,
  });
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
  return token;
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) {
    await rpc("verno4u_delete_session", { p_token_hash: hashToken(token) });
  }
  jar.delete(ADMIN_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const session = await rpc<{ kind: string } | null>("verno4u_get_session", {
    p_token_hash: hashToken(token),
  });
  return session?.kind === "admin";
}

export async function createStudentSession(studentId: string) {
  const token = nanoid(32);
  const expires = new Date(Date.now() + SESSION_TTL_SEC * 1000).toISOString();
  await rpc("verno4u_put_session", {
    p_token_hash: hashToken(token),
    p_kind: "student",
    p_student_id: studentId,
    p_expires_at: expires,
  });
  const jar = await cookies();
  jar.set(STUDENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
  return token;
}

export async function getStudentSessionId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  const session = await rpc<{ kind: string; student_id: string | null } | null>(
    "verno4u_get_session",
    { p_token_hash: hashToken(token) },
  );
  if (!session || session.kind !== "student") return null;
  return session.student_id;
}

export async function canAccessStudent(studentId: string): Promise<boolean> {
  if (await isAdminAuthenticated()) return true;
  const sid = await getStudentSessionId();
  return sid === studentId;
}

export function checkAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD || "change-me";
  return safeEqual(password, expected);
}

export function randomId() {
  return randomBytes(12).toString("hex");
}
