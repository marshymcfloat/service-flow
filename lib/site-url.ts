const DEFAULT_SITE_URL = "https://www.serviceflow.store";

function normalizeBaseUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  return url.toString().replace(/\/$/, "");
}

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    DEFAULT_SITE_URL;

  try {
    return normalizeBaseUrl(configuredUrl);
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function toAbsoluteUrl(pathname = "/") {
  return new URL(pathname, `${getSiteUrl()}/`).toString();
}
