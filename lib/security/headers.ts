const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicyDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "script-src 'self' 'unsafe-inline' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "connect-src 'self' https:",
  "frame-src 'self' https:",
];

if (isProduction) {
  contentSecurityPolicyDirectives.push("upgrade-insecure-requests");
}

export const CONTENT_SECURITY_POLICY = contentSecurityPolicyDirectives.join("; ");

export const SECURITY_HEADERS = {
  "X-DNS-Prefetch-Control": "on",
  ...(isProduction
    ? {
        "Strict-Transport-Security":
          "max-age=63072000; includeSubDomains; preload",
      }
    : {}),
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
} as const;
