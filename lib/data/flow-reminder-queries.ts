import { prisma } from "@/prisma/prisma";

/**
 * Gets the count of flow reminder emails sent this week (PH timezone)
 * Week runs from Monday 00:00 to Sunday 23:59:59
 */
export async function getThisWeeksFlowRemindersCount(
  businessId: string,
): Promise<number> {
  const now = new Date();

  // Calculate Monday of current week (PH time)
  const startOfWeek = getStartOfWeekPH(now);

  // Calculate Sunday end of current week (PH time)
  const endOfWeek = getEndOfWeekPH(now);

  const count = await prisma.outboxMessage.count({
    where: {
      business_id: businessId,
      event_type: "FLOW_REMINDER_SENT",
      processed: true, // Only count successfully sent reminders
      created_at: {
        gte: startOfWeek,
        lte: endOfWeek,
      },
    },
  });

  return count;
}

/**
 * Helper: Get Monday 00:00:00 of current week in PH timezone
 */
function getStartOfWeekPH(date: Date): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value;

  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const currentDay = dayMap[weekday || "Mon"] || 1;

  // Calculate days to subtract to get to Monday
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;

  // Create date for Monday in PH timezone
  const mondayDate = new Date(date);
  mondayDate.setDate(mondayDate.getDate() - daysToMonday);

  const mondayParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(mondayDate);

  const mondayYear = parseInt(
    mondayParts.find((p) => p.type === "year")?.value || "0",
  );
  const mondayMonth = parseInt(
    mondayParts.find((p) => p.type === "month")?.value || "0",
  );
  const mondayDay = parseInt(
    mondayParts.find((p) => p.type === "day")?.value || "0",
  );

  const isoString = `${mondayYear}-${String(mondayMonth).padStart(2, "0")}-${String(mondayDay).padStart(2, "0")}T00:00:00+08:00`;
  return new Date(isoString);
}

/**
 * Helper: Get Sunday 23:59:59 of current week in PH timezone
 */
function getEndOfWeekPH(date: Date): Date {
  const startOfWeek = getStartOfWeekPH(date);
  // Add 7 days minus 1ms to get end of Sunday
  return new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
}
