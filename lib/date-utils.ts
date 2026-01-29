export const TIMEZONE_PH = "Asia/Manila";

export function getStartOfDayPH(date: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE_PH,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "0");
  const month =
    parseInt(parts.find((p) => p.type === "month")?.value || "0") - 1;
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "0");

  const isoString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+08:00`;
  return new Date(isoString);
}

export function getEndOfDayPH(date: Date = new Date()): Date {
  const start = getStartOfDayPH(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function getMonthRangePH(year: number, month: number) {
  const startBase = `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00+08:00`;
  const startDate = new Date(startBase);

  const nextMonthDate = new Date(startDate);
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

  let endYear = year;
  let endMonth = month + 1;
  if (endMonth > 11) {
    endYear += 1;
    endMonth = 0;
  }
  const endBase = `${endYear}-${String(endMonth + 1).padStart(2, "0")}-01T00:00:00+08:00`;
  const endDate = new Date(new Date(endBase).getTime() - 1);

  return { startDate, endDate };
}

export function formatPH(
  date: Date | string | null | undefined,
  formatStr: "MMM d, h:mm a" | "h:mm a" | "PPP p" | "EEE",
): string {
  if (!date) return "Unscheduled";
  const d = new Date(date);

  let options: Intl.DateTimeFormatOptions = {
    timeZone: TIMEZONE_PH,
  };

  switch (formatStr) {
    case "MMM d, h:mm a":
      options = {
        ...options,
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      };
      break;
    case "h:mm a":
      options = {
        ...options,
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      };
      break;
    case "PPP p":
      options = {
        ...options,
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      };
      break;
    case "EEE":
      options = {
        ...options,
        weekday: "short",
      };
      break;
  }

  return new Intl.DateTimeFormat("en-US", options).format(d);
}
