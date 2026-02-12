import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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

  if (pathname.startsWith("/app")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname.startsWith("/app") && token?.mustChangePassword) {
    const segments = pathname.split("/").filter(Boolean);
    const businessSlug = segments[1];
    if (businessSlug) {
      const changePath = `/app/${businessSlug}/change-password`;
      if (!pathname.startsWith(changePath)) {
        return NextResponse.redirect(new URL(changePath, request.url));
      }
    }
  }

  if (pathname === "/" && isAuthenticated) {
    const businessSlug = token.businessSlug as string;
    if (businessSlug) {
      return NextResponse.redirect(
        new URL(`/app/${businessSlug}`, request.url),
      );
    }
  }

  const response = NextResponse.next();

  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );

  if (pathname.startsWith("/api")) {
    const forwardedFor = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const ip = forwardedFor.split(",")[0]?.trim() || "127.0.0.1";
    const result = rateLimit(`${pathname}:${ip}`);

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
