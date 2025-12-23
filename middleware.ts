import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  // If auth isn't configured yet, don't block (dev-friendly).
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return NextResponse.next();

  // Protect app pages; allow landing and auth routes.
  const { pathname } = req.nextUrl;
  if (pathname === "/" || pathname.startsWith("/api/auth") || pathname.startsWith("/signin")) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/webhooks", "/signals/:path*", "/trades/:path*", "/watchlist", "/settings", "/pnl"],
};


