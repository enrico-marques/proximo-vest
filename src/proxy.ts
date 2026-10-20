import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate for signed-in areas: it only checks that a session cookie exists,
 * without touching the database. The cookie can be stale or forged, so pages and API
 * routes still verify the session themselves (requirePageAuth / defineRoute).
 */
export function proxy(req: NextRequest) {
  if (getSessionCookie(req)) return NextResponse.next();

  return NextResponse.redirect(new URL("/auth/login", req.url));
}

export const config = {
  // API routes answer 401 themselves; redirecting them would break fetch callers.
  matcher: ["/dashboard/:path*"],
};
