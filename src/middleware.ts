import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role as string | undefined;
  const { nextUrl } = req;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isLoginRoute = nextUrl.pathname === "/login";
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isCaptainRoute = nextUrl.pathname.startsWith("/captain");
  const isAdminUser = role ? ADMIN_ROLES.includes(role) : false;

  // Allow all API auth routes (NextAuth internals)
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // If logged in and trying to access login page, redirect to their dashboard
  if (isLoginRoute) {
    if (isLoggedIn) {
      if (isAdminUser) {
        return NextResponse.redirect(new URL("/admin", nextUrl));
      } else {
        return NextResponse.redirect(new URL("/captain", nextUrl));
      }
    }
    return NextResponse.next();
  }

  // If not logged in and trying to access protected routes, redirect to login
  if (!isLoggedIn && (isAdminRoute || isCaptainRoute || nextUrl.pathname === "/")) {
    const callbackUrl = nextUrl.pathname + nextUrl.search;
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based authorization
  if (isLoggedIn) {
    // Admin roles trying to access captain routes → redirect to admin dashboard
    if (isCaptainRoute && isAdminUser) {
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }
    // Captain trying to access admin routes → redirect to captain dashboard
    if (isAdminRoute && !isAdminUser) {
      return NextResponse.redirect(new URL("/captain", nextUrl));
    }
    // Root route redirect
    if (nextUrl.pathname === "/") {
      if (isAdminUser) {
        return NextResponse.redirect(new URL("/admin", nextUrl));
      } else {
        return NextResponse.redirect(new URL("/captain", nextUrl));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|logo.png|icons/).*)" ],
};
