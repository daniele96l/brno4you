import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { getRedis, keys } from "./redis";

const ADMIN_COOKIE = "verno_admin";
const STUDENT_COOKIE = "verno_student";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

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
  const redis = getRedis();
  await redis.set(keys.sessionAdmin(hashToken(token)), "1", "EX", SESSION_TTL);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL,
  });
  return token;
}

export async function destroyAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) {
    await getRedis().del(keys.sessionAdmin(hashToken(token)));
  }
  jar.delete(ADMIN_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const exists = await getRedis().exists(keys.sessionAdmin(hashToken(token)));
  return exists === 1;
}

export async function requireAdmin() {
  const ok = await isAdminAuthenticated();
  if (!ok) throw new Error("UNAUTHORIZED");
}

export async function createStudentSession(studentId: string) {
  const token = nanoid(32);
  const redis = getRedis();
  await redis.set(
    keys.sessionStudent(hashToken(token)),
    studentId,
    "EX",
    SESSION_TTL,
  );
  const jar = await cookies();
  jar.set(STUDENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL,
  });
  return token;
}

export async function getStudentSessionId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  return getRedis().get(keys.sessionStudent(hashToken(token)));
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
