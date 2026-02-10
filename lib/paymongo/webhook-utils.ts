type JsonLike = Record<string, unknown>;

function getObject(value: unknown): JsonLike | undefined {
  return value && typeof value === "object" ? (value as JsonLike) : undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNestedString(
  obj: JsonLike | undefined,
  key: string,
): string | undefined {
  if (!obj) return undefined;
  const nested = getObject(obj[key]);
  return getString(nested?.id);
}

export function extractPaymentIntentReferences(body: unknown) {
  const root = getObject(body);
  const data = getObject(root?.data);
  const dataAttributes = getObject(data?.attributes);
  const dataNode = getObject(dataAttributes?.data) || data;
  const attributes = getObject(dataNode?.attributes) || dataNode;

  const paymentIntentId =
    getString(attributes?.payment_intent_id) ||
    getNestedString(attributes, "payment_intent") ||
    getString(attributes?.payment_intent);

  const paymentId = getString(dataNode?.id) || getString(attributes?.id);

  const paymentMethodId =
    getString(attributes?.payment_method_id) ||
    getNestedString(attributes, "payment_method") ||
    getString(attributes?.payment_method);

  return { paymentIntentId, paymentId, paymentMethodId };
}
