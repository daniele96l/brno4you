import { NextResponse } from "next/server";
import {
  checkAdminPassword,
  createAdminSessionToken,
  ADMIN_COOKIE,
  SESSION_TTL_SEC,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { password?: string };
    if (!body.password || !checkAdminPassword(body.password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = await createAdminSessionToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SEC,
    });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
