export function getMaxBookingDate({
  bookingV2Enabled,
  bookingHorizonDays,
  now = new Date(),
}: {
  bookingV2Enabled: boolean;
  bookingHorizonDays: number;
  now?: Date;
}) {
  const max = new Date(now);
  const horizon = bookingV2Enabled ? Math.max(1, bookingHorizonDays) : 1;
  max.setDate(max.getDate() + horizon - 1);
  max.setHours(23, 59, 59, 999);
  return max;
}

export function getSlotEmptyState({
  isSelectedDateInFuture,
  bookingV2Enabled,
  isSelectedDateToday,
  hasTentativeAlternativeSlots,
}: {
  isSelectedDateInFuture: boolean;
  bookingV2Enabled: boolean;
  isSelectedDateToday: boolean;
  hasTentativeAlternativeSlots: boolean;
}) {
  if (isSelectedDateInFuture && !bookingV2Enabled) {
    return {
      title: "Future slots are currently disabled",
      description: "Ask the business to enable Booking V2 for future-date scheduling.",
    };
  }

  if (isSelectedDateToday && hasTentativeAlternativeSlots) {
    return {
      title: "No confirmed slots right now",
      description:
        "Tentative slots later today are available. Pick one below or try another time.",
    };
  }

  return {
    title: "No available slots for the selected services",
    description: "Try another date or a different service combination.",
  };
}
