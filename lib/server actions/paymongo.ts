"use server";

import { redirect } from "next/navigation";

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
