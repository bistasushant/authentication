import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/_server/_features/_auth/_jwt/jwt.service";
import { COOKIE_NAME } from "@/_server/_features/_auth/_constants/auth.constants";

/**
 * Next.js 16 Proxy (formerly middleware).
 *
 * The main workspace at "/" is public — unauthenticated users see the shell
 * and are prompted to sign in via a modal when they try to take action.
 *
 * Only hard-protected routes (future /dashboard, /settings etc.) redirect
 * to "/". The /login/verify route is kept for OTP deep-links.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value ?? null;
  const user = token ? await verifyToken(token) : null;
  const isAuthenticated = !!user;

  // Authenticated users visiting /login or /login/verify go back to "/"
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
