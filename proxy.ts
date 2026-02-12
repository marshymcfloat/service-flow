import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SECURITY_HEADERS } from "@/lib/security/headers";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/.well-known/")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const isAuthenticated = !!token;
  const { pathname } = request.nextUrl;
  const role = token?.role as string | undefined;
  const isPlatformAdmin = role === "PLATFORM_ADMIN";
  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");
  const isPlatformRoute =
    pathname === "/platform" || pathname.startsWith("/platform/");

  if (isAppRoute) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (isPlatformAdmin) {
      return NextResponse.redirect(new URL("/platform", request.url));
    }
  }

  if (isPlatformRoute) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (!isPlatformAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (
    isAppRoute &&
    token?.mustChangePassword &&
    !isPlatformAdmin
  ) {
    const segments = pathname.split("/").filter(Boolean);
    const businessSlug = segments[1];
    if (businessSlug) {
      const changePath = `/app/${businessSlug}/change-password`;
      if (!pathname.startsWith(changePath)) {
        return NextResponse.redirect(new URL(changePath, request.url));
      }
    }
  }

  if (isAppRoute && !isPlatformAdmin) {
    const segments = pathname.split("/").filter(Boolean);
    const routeBusinessSlug = segments[1];
    const tokenBusinessSlug = token?.businessSlug as string | undefined;
    if (
      routeBusinessSlug &&
      tokenBusinessSlug &&
      routeBusinessSlug !== tokenBusinessSlug
    ) {
      return NextResponse.redirect(new URL(`/app/${tokenBusinessSlug}`, request.url));
    }
  }

  if (pathname === "/" && isAuthenticated) {
    if (isPlatformAdmin) {
      return NextResponse.redirect(new URL("/platform", request.url));
    }
    const businessSlug = token?.businessSlug as string | undefined;
    if (businessSlug) {
      return NextResponse.redirect(
        new URL(`/app/${businessSlug}`, request.url),
      );
    }
  }

  const response = NextResponse.next();

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  if (pathname.startsWith("/api")) {
    const forwardedFor = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const ip = forwardedFor.split(",")[0]?.trim() || "127.0.0.1";
    const result = await rateLimit(`${pathname}:${ip}`);

    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(60) } },
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|\\.well-known).*)"],
};
