import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminArea =
    pathname === "/admin" || pathname.startsWith("/admin/");
  const isLogin = pathname === "/admin/login" || pathname.startsWith("/admin/login/");

  if (isAdminArea && !isLogin) {
    const token = req.cookies.get("brno4you_admin")?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
