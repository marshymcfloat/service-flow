export function extractPaymentIntentReferences(body: any) {
  const dataNode = body?.data?.attributes?.data || body?.data;
  const attributes = dataNode?.attributes || dataNode;

  const paymentIntentId =
    attributes?.payment_intent_id ||
    attributes?.payment_intent?.id ||
    attributes?.payment_intent;
  const paymentId = dataNode?.id || attributes?.id;
  const paymentMethodId =
    attributes?.payment_method_id ||
    attributes?.payment_method?.id ||
    attributes?.payment_method;

  return { paymentIntentId, paymentId, paymentMethodId };
}
