import { logger } from "@/lib/logger";

const DEFAULT_GRAPH_VERSION = "v22.0";
const GRAPH_BASE_URL = "https://graph.facebook.com";

type MetaTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type MetaPageAccount = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
  } | null;
};

type MetaPagedResponse<T> = {
  data?: T[];
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

type MetaPublishResponse = {
  id?: string;
  post_id?: string;
  error?: {
    message?: string;
    code?: number;
  };
};

type MetaMediaContainerResponse = {
  id?: string;
  error?: {
    message?: string;
    code?: number;
  };
};

type MetaPermalinkResponse = {
  permalink?: string;
  permalink_url?: string;
};

function getGraphVersion() {
  return process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
}

function getGraphApiUrl(path: string) {
  const version = getGraphVersion();
  return `${GRAPH_BASE_URL}/${version}/${path.replace(/^\//, "")}`;
}

function getMetaAppConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    throw new Error(
      "META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI must be configured",
    );
  }

  return { appId, appSecret, redirectUri };
}

async function parseMetaResponse<T>(response: Response): Promise<T> {
  const json = (await response.json()) as
    | T
    | { error?: { message?: string; code?: number; type?: string } };

  if (!response.ok) {
    const message =
      (json as { error?: { message?: string } }).error?.message ||
      `Meta API request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (
    typeof json === "object" &&
    json !== null &&
    "error" in json &&
    (json as { error?: unknown }).error
  ) {
    const message =
      (json as { error?: { message?: string } }).error?.message ||
      "Meta API returned an error";
    throw new Error(message);
  }

  return json as T;
}

function buildUrl(path: string, params: Record<string, string>) {
  const url = new URL(getGraphApiUrl(path));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

export async function exchangeCodeForMetaUserToken(code: string) {
  const { appId, appSecret, redirectUri } = getMetaAppConfig();
  const url = buildUrl("oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(url.toString(), { method: "GET" });
  return parseMetaResponse<MetaTokenResponse>(response);
}

export async function getManagedMetaPages(userAccessToken: string) {
  const url = buildUrl("me/accounts", {
    access_token: userAccessToken,
    fields: "id,name,access_token,instagram_business_account{id,username,name}",
    limit: "50",
  });

  const response = await fetch(url.toString(), { method: "GET" });
  const payload = await parseMetaResponse<MetaPagedResponse<MetaPageAccount>>(
    response,
  );

  return payload.data ?? [];
}

export async function publishToFacebookPage(input: {
  pageId: string;
  accessToken: string;
  caption: string;
  mediaUrl?: string | null;
}) {
  const payload = new URLSearchParams();
  payload.set("access_token", input.accessToken);

  let endpoint = `${input.pageId}/feed`;
  if (input.mediaUrl) {
    endpoint = `${input.pageId}/photos`;
    payload.set("url", input.mediaUrl);
    payload.set("caption", input.caption);
  } else {
    payload.set("message", input.caption);
  }

  const response = await fetch(getGraphApiUrl(endpoint), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString(),
  });
  const published = await parseMetaResponse<MetaPublishResponse>(response);

  const remotePostId = published.post_id || published.id;
  let permalink: string | undefined;

  if (remotePostId) {
    try {
      const permalinkUrl = buildUrl(remotePostId, {
        access_token: input.accessToken,
        fields: "permalink_url",
      });
      const permalinkResponse = await fetch(permalinkUrl.toString(), {
        method: "GET",
      });
      const permalinkPayload = await parseMetaResponse<MetaPermalinkResponse>(
        permalinkResponse,
      );
      permalink = permalinkPayload.permalink_url;
    } catch (error) {
      logger.warn("[Social] Unable to fetch Facebook permalink", {
        remotePostId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    remotePostId: remotePostId ?? null,
    permalink: permalink ?? null,
  };
}

export async function publishToInstagramBusiness(input: {
  instagramBusinessId: string;
  accessToken: string;
  caption: string;
  mediaUrl: string;
}) {
  const createPayload = new URLSearchParams();
  createPayload.set("access_token", input.accessToken);
  createPayload.set("image_url", input.mediaUrl);
  createPayload.set("caption", input.caption);

  const createResponse = await fetch(
    getGraphApiUrl(`${input.instagramBusinessId}/media`),
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createPayload.toString(),
    },
  );
  const container = await parseMetaResponse<MetaMediaContainerResponse>(
    createResponse,
  );
  if (!container.id) {
    throw new Error("Meta did not return an Instagram media container ID");
  }

  const publishPayload = new URLSearchParams();
  publishPayload.set("access_token", input.accessToken);
  publishPayload.set("creation_id", container.id);

  const publishResponse = await fetch(
    getGraphApiUrl(`${input.instagramBusinessId}/media_publish`),
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishPayload.toString(),
    },
  );
  const published = await parseMetaResponse<MetaPublishResponse>(publishResponse);
  const remotePostId = published.id || null;

  let permalink: string | null = null;
  if (remotePostId) {
    try {
      const permalinkUrl = buildUrl(remotePostId, {
        access_token: input.accessToken,
        fields: "permalink",
      });
      const permalinkResponse = await fetch(permalinkUrl.toString(), {
        method: "GET",
      });
      const permalinkPayload = await parseMetaResponse<MetaPermalinkResponse>(
        permalinkResponse,
      );
      permalink = permalinkPayload.permalink ?? null;
    } catch (error) {
      logger.warn("[Social] Unable to fetch Instagram permalink", {
        remotePostId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    remotePostId,
    permalink,
  };
}
