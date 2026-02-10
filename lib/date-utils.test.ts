import { expect, test, describe } from "vitest";
import { getStartOfDayPH, getEndOfDayPH, formatPH } from "@/lib/date-utils";

describe("Date Utils (PH Timezone)", () => {
  // We can't easily change process.env.TZ in the middle of a test file in some environments,
  // but we can trust that the utility functions use the hardcoded "Asia/Manila".

  test("getStartOfDayPH returns 00:00:00+08:00", () => {
    // Create a date that is definitely noon UTC
    const date = new Date("2024-01-01T12:00:00Z");

    // In PH (UTC+8), 12:00 UTC is 20:00 PH.
    // So "Start of Day" for this date should be 2024-01-01 00:00:00 PH time.
    // PH Offset is +08:00.
    // 2024-01-01T00:00:00+08:00 is 2023-12-31T16:00:00Z in UTC.

    const startOfDay = getStartOfDayPH(date);

    // Check ISO string to verify accurate instant
    expect(startOfDay.toISOString()).toBe("2023-12-31T16:00:00.000Z");
  });

  test("getEndOfDayPH returns 23:59:59.999+08:00", () => {
    const date = new Date("2024-01-01T12:00:00Z");
    const endOfDay = getEndOfDayPH(date);

    // 2024-01-01 23:59:59.999 PH time
    // - 8 hours = 15:59:59.999 UTC
    expect(endOfDay.toISOString()).toBe("2024-01-01T15:59:59.999Z");
  });

  test("formatPH formats correctly for PH timezone", () => {
    // 2024-01-01 00:00 UTC = 08:00 AM PH
    const date = new Date("2024-01-01T00:00:00Z");

    const formatted = formatPH(date, "h:mm a");
    expect(formatted).toBe("8:00 AM");
  });

  test("formatPH handles null/undefined", () => {
    expect(formatPH(null, "h:mm a")).toBe("Unscheduled");
    expect(formatPH(undefined, "h:mm a")).toBe("Unscheduled");
  });
});
