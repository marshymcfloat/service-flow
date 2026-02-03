export const getApplicableDiscount = (
  serviceId: number,
  packageId: number | undefined,
  price: number,
  saleEvents: any[],
) => {
  if (!saleEvents || saleEvents.length === 0) return null;

  const applicableEvent = saleEvents
    .filter((event) => {
      if (packageId) {
        return event.applicable_packages.some((p: any) => p.id === packageId);
      }
      return event.applicable_services.some((s: any) => s.id === serviceId);
    })
    .sort((a, b) => {
      const valA =
        a.discount_type === "PERCENTAGE"
          ? (price * a.discount_value) / 100
          : a.discount_value;
      const valB =
        b.discount_type === "PERCENTAGE"
          ? (price * b.discount_value) / 100
          : b.discount_value;
      return valB - valA;
    })[0];

  if (applicableEvent) {
    let discountAmount = 0;
    if (applicableEvent.discount_type === "PERCENTAGE") {
      discountAmount = (price * applicableEvent.discount_value) / 100;
    } else {
      discountAmount = applicableEvent.discount_value;
    }
    // Ensure we don't discount more than the price
    discountAmount = Math.min(discountAmount, price);

    if (discountAmount > 0) {
      return {
        finalPrice: price - discountAmount,
        discount: discountAmount,
        reason: applicableEvent.title,
      };
    }
  }
  return null;
};
