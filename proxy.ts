import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const isAuthenticated = !!token;

  if (request.nextUrl.pathname.startsWith("/app")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (request.nextUrl.pathname === "/" && isAuthenticated) {
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

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
