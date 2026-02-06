"use server";

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
  metadata?: Record<string, any>;
  allowed_payment_methods?: string[];
}

export async function createPayMongoCheckoutSession({
  line_items,
  description,
  metadata,
  success_url = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") +
    "/booking/success",
  cancel_url = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") +
    "/booking/cancel",
  allowed_payment_methods = ["qrph", "gcash", "card"],
}: CreateCheckoutSessionParams) {
  const options = {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY || "").toString("base64")}`,
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
          metadata,
        },
      },
    }),
  };

  try {
    const response = await fetch(
      "https://api.paymongo.com/v1/checkout_sessions",
      options,
    );
    const data = await response.json();

    if (data.errors) {
      console.error("PayMongo Error:", data.errors);
      throw new Error(
        data.errors[0]?.detail || "Failed to create checkout session",
      );
    }

    return data.data.attributes.checkout_url;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

const PAYMONGO_BASE_URL = "https://api.paymongo.com/v1";

const getPayMongoAuthHeader = () =>
  `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY || "").toString(
    "base64",
  )}`;

const paymongoRequest = async <T>(
  endpoint: string,
  options: RequestInit,
): Promise<T> => {
  const response = await fetch(`${PAYMONGO_BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (data.errors) {
    console.error("PayMongo Error:", data.errors);
    throw new Error(data.errors[0]?.detail || "PayMongo request failed");
  }

  return data;
};

export interface PayMongoBillingDetails {
  name: string;
  email?: string;
  phone?: string;
}

export interface CreateQrPaymentIntentParams {
  amount: number;
  description?: string;
  metadata?: Record<string, any>;
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
  const paymentIntentPayload = {
    data: {
      attributes: {
        amount: Math.round(amount),
        currency: "PHP",
        payment_method_allowed: ["qrph"],
        description,
        statement_descriptor: "Service Flow",
        metadata,
      },
    },
  };

  const paymentIntentResponse: any = await paymongoRequest(
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

  const paymentMethodResponse: any = await paymongoRequest(
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

  const attachResponse: any = await paymongoRequest(
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

export async function getPayMongoPaymentIntentStatus(paymentIntentId: string) {
  const response: any = await paymongoRequest(
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
  const response: any = await paymongoRequest(
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
