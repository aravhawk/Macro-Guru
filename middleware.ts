import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Better Auth sets a session cookie. We check for its presence.
  // The actual session validation happens in API route handlers via auth.api.getSession().
  // This middleware just redirects unauthenticated users from protected routes.
  const sessionCookie = req.cookies.get("better-auth.session_token");

  const isAuthRoute =
    req.nextUrl.pathname.startsWith("/sign-in") ||
    req.nextUrl.pathname.startsWith("/sign-up");

  // If user has no session and is trying to access a protected route, redirect to sign-in
  if (!sessionCookie && !isAuthRoute && req.nextUrl.pathname !== "/") {
    // Only redirect for chat routes (not API, not auth pages)
    const isApiRoute = req.nextUrl.pathname.startsWith("/api/");
    if (!isApiRoute) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

  // If user is authenticated and trying to access auth pages, redirect to home
  if (sessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, manifest.json, sw.js, icons (PWA files)
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons/).*)",
  ],
};
