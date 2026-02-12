"use server";
import { headers } from "next/headers";
import { prisma } from "@/prisma/prisma";
import { rateLimit } from "@/lib/rate-limit";

interface LineItem {
  name: string;
  amount: number;
  currency: string;
  quantity: number;
  images?: string[];
  description?: string;
}

interface CreateCheckoutSessionParams {
  line_items: LineItem[];
  description?: string;
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, unknown>;
  allowed_payment_methods?: string[];
}

export interface CreateCheckoutSessionResult {
  checkoutUrl: string;
  checkoutSessionId: string | null;
}

type PayMongoError = { detail?: string };
type PayMongoApiResponse<T extends Record<string, unknown> = Record<string, unknown>> =
  T & {
    errors?: PayMongoError[];
  };

type PayMongoMetadataValue = string | number | boolean | null;

function normalizePayMongoMetadata(
  metadata?: Record<string, unknown>,
): Record<string, PayMongoMetadataValue> | undefined {
  if (!metadata) return undefined;

  const normalizedEntries = Object.entries(metadata).flatMap(([key, value]) => {
    if (value === undefined) return [];

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return [[key, value] as [string, PayMongoMetadataValue]];
    }

    if (value instanceof Date) {
      return [[key, value.toISOString()] as [string, PayMongoMetadataValue]];
    }

    return [[key, JSON.stringify(value)] as [string, PayMongoMetadataValue]];
  });

  return Object.fromEntries(normalizedEntries);
}

function getPayMongoSecretKey() {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYMONGO_SECRET_KEY is not configured");
  }
  return secretKey;
}

export async function createPayMongoCheckoutSessionDetailed({
  line_items,
  description,
  metadata,
  success_url = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") +
    "/booking/success",
  cancel_url = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") +
    "/booking/cancel",
  allowed_payment_methods = ["qrph", "gcash", "card"],
}: CreateCheckoutSessionParams): Promise<CreateCheckoutSessionResult> {
  const normalizedMetadata = normalizePayMongoMetadata(metadata);

  try {
    const data = await paymongoRequest<{
      data?: {
        id?: string;
        attributes?: {
          checkout_url?: string;
        };
      };
    }>("/checkout_sessions", {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        authorization: `Basic ${Buffer.from(getPayMongoSecretKey()).toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            payment_method_types: allowed_payment_methods,
            line_items,
            description,
            success_url,
            cancel_url,
            metadata: normalizedMetadata,
          },
        },
      }),
    });

    const checkoutUrl = data.data?.attributes?.checkout_url ?? null;
    const checkoutSessionId = data.data?.id ?? null;
    if (!checkoutUrl) {
      throw new Error("Failed to create checkout session");
    }

    return { checkoutUrl, checkoutSessionId };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function createPayMongoCheckoutSession(
  params: CreateCheckoutSessionParams,
) {
  const result = await createPayMongoCheckoutSessionDetailed(params);
  return result.checkoutUrl;
}

const PAYMONGO_BASE_URL = "https://api.paymongo.com/v1";

const getPayMongoAuthHeader = () =>
  `Basic ${Buffer.from(getPayMongoSecretKey()).toString(
    "base64",
  )}`;

const paymongoRequest = async <T>(
  endpoint: string,
  options: RequestInit,
): Promise<T> => {
  const response = await fetch(`${PAYMONGO_BASE_URL}${endpoint}`, options);
  const data = (await response.json()) as PayMongoApiResponse<
    T extends Record<string, unknown> ? T : Record<string, unknown>
  >;

  if (data.errors) {
    console.error("PayMongo Error:", data.errors);
    throw new Error(data.errors[0]?.detail || "PayMongo request failed");
  }

  return data as unknown as T;
};

export interface PayMongoBillingDetails {
  name: string;
  email?: string;
  phone?: string;
}

export interface CreateQrPaymentIntentParams {
  amount: number;
  description?: string;
  metadata?: Record<string, unknown>;
  billing: PayMongoBillingDetails;
  expirySeconds?: number;
  returnUrl?: string;
}

export interface PayMongoQrPaymentResult {
  paymentIntentId: string;
  paymentMethodId: string;
  qrImage: string;
  expiresAt?: string;
}

export async function createPayMongoQrPaymentIntent({
  amount,
  description,
  metadata,
  billing,
  expirySeconds = 600,
  returnUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") +
    "/booking/success",
}: CreateQrPaymentIntentParams): Promise<PayMongoQrPaymentResult> {
  const normalizedMetadata = normalizePayMongoMetadata(metadata);

  const paymentIntentPayload = {
    data: {
      attributes: {
        amount: Math.round(amount),
        currency: "PHP",
        payment_method_allowed: ["qrph"],
        description,
        statement_descriptor: "Service Flow",
        metadata: normalizedMetadata,
      },
    },
  };

  const paymentIntentResponse = await paymongoRequest<{
    data?: {
      id?: string;
      attributes?: {
        client_key?: string;
      };
    };
  }>(
    "/payment_intents",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        authorization: getPayMongoAuthHeader(),
      },
      body: JSON.stringify(paymentIntentPayload),
    },
  );

  const paymentIntent = paymentIntentResponse.data;
  const clientKey = paymentIntent?.attributes?.client_key;

  if (!paymentIntent?.id || !clientKey) {
    throw new Error("Failed to create PayMongo payment intent");
  }

  const paymentMethodPayload = {
    data: {
      attributes: {
        type: "qrph",
        billing: {
          name: billing.name,
          email: billing.email,
          phone: billing.phone,
        },
        expiry_seconds: expirySeconds,
      },
    },
  };

  const paymentMethodResponse = await paymongoRequest<{
    data?: {
      id?: string;
    };
  }>(
    "/payment_methods",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        authorization: getPayMongoAuthHeader(),
      },
      body: JSON.stringify(paymentMethodPayload),
    },
  );

  const paymentMethod = paymentMethodResponse.data;

  if (!paymentMethod?.id) {
    throw new Error("Failed to create PayMongo payment method");
  }

  const attachPayload = {
    data: {
      attributes: {
        payment_method: paymentMethod.id,
        client_key: clientKey,
        return_url: returnUrl,
      },
    },
  };

  const attachResponse = await paymongoRequest<{
    data?: {
      attributes?: {
        next_action?: {
          code?: {
            image_url?: string;
            expires_at?: string;
          };
          redirect?: {
            url?: string;
            checkout_url?: string;
          };
        };
      };
    };
  }>(
    `/payment_intents/${paymentIntent.id}/attach`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        authorization: getPayMongoAuthHeader(),
      },
      body: JSON.stringify(attachPayload),
    },
  );

  const nextAction = attachResponse?.data?.attributes?.next_action;
  const qrImage =
    nextAction?.code?.image_url ||
    nextAction?.redirect?.url ||
    nextAction?.redirect?.checkout_url;

  if (!qrImage) {
    throw new Error("QR image not available from PayMongo");
  }

  return {
    paymentIntentId: paymentIntent.id,
    paymentMethodId: paymentMethod.id,
    qrImage,
    expiresAt: nextAction?.code?.expires_at,
  };
}

export async function getPayMongoPaymentIntentStatus(
  paymentIntentId: string,
  businessSlug: string,
) {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for") || "unknown";
  const clientIp = forwardedFor.split(",")[0]?.trim() || "unknown";

  const limiter = await rateLimit(`${clientIp}:${businessSlug}:paymongo-status`, {
    windowMs: 60_000,
    maxRequests: 60,
  });

  if (!limiter.success) {
    throw new Error("Too many status checks. Please slow down.");
  }

  const booking = await prisma.booking.findFirst({
    where: {
      paymongo_payment_intent_id: paymentIntentId,
      business: { slug: businessSlug },
    },
    select: { id: true },
  });

  if (!booking) {
    throw new Error("Payment intent not found for this booking context.");
  }

  const response = await paymongoRequest<{
    data?: {
      id?: string;
      attributes?: {
        status?: string;
        amount?: number;
        currency?: string;
        last_payment_error?: unknown;
      };
    };
  }>(
    `/payment_intents/${paymentIntentId}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: getPayMongoAuthHeader(),
      },
    },
  );

  const intent = response?.data;

  return {
    id: intent?.id,
    status: intent?.attributes?.status,
    amount: intent?.attributes?.amount,
    currency: intent?.attributes?.currency,
    lastPaymentError: intent?.attributes?.last_payment_error,
  };
}

export async function getPayMongoPaymentIntentById(paymentIntentId: string) {
  const response = await paymongoRequest<{
    data?: {
      id?: string;
      attributes?: Record<string, unknown>;
    };
  }>(
    `/payment_intents/${paymentIntentId}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: getPayMongoAuthHeader(),
      },
    },
  );

  return response?.data;
}
