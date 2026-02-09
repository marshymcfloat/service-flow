import { expect, test, describe } from "vitest";
import { calculateBookingTotal } from "@/lib/utils/pricing";

describe("calculateBookingTotal", () => {
  test("calculates simple full cash payment correctly", () => {
    const total = calculateBookingTotal({
      subtotal: 100,
      paymentMethod: "CASH",
      paymentType: "FULL",
    });
    expect(total).toBe(100);
  });

  test("calculates simple downpayment cash correctly", () => {
    const total = calculateBookingTotal({
      subtotal: 100,
      paymentMethod: "CASH",
      paymentType: "DOWNPAYMENT",
    });
    expect(total).toBe(50);
  });

  test("applies 1.5% convenience fee for QRPH FULL payment", () => {
    const total = calculateBookingTotal({
      subtotal: 100,
      paymentMethod: "QRPH",
      paymentType: "FULL",
    });
    // 100 + (100 * 0.015) = 101.5
    expect(total).toBe(101.5);
  });

  test("applies 1.5% convenience fee for QRPH DOWNPAYMENT", () => {
    const total = calculateBookingTotal({
      subtotal: 100,
      paymentMethod: "QRPH",
      paymentType: "DOWNPAYMENT",
    });
    // 50 + (50 * 0.015) = 50 + 0.75 = 50.75
    expect(total).toBe(50.75);
  });

  test("handles floating point inputs safely (19.99)", () => {
    const total = calculateBookingTotal({
      subtotal: 19.99,
      paymentMethod: "QRPH",
      paymentType: "FULL",
    });
    // 19.99 * 100 = 1999 cents
    // Fee: 1999 * 0.015 = 29.985 -> rounds to 30 cents
    // Total cents: 1999 + 30 = 2029
    // Result: 20.29
    expect(total).toBe(20.29);
  });

  test("handles floating point inputs safely with DOWNPAYMENT", () => {
    const total = calculateBookingTotal({
      subtotal: 19.99,
      paymentMethod: "QRPH",
      paymentType: "DOWNPAYMENT",
    });
    // 19.99 * 100 = 1999 cents
    // Downpayment: 1999 * 0.5 = 999.5 -> rounds to 1000 cents (10.00)
    // Fee: 1000 * 0.015 = 15 cents
    // Total: 1015 cents -> 10.15
    expect(total).toBe(10.15);
  });

  test("applies voucher discount before calculation", () => {
    const total = calculateBookingTotal({
      subtotal: 100,
      voucherDiscount: 20,
      paymentMethod: "QRPH",
      paymentType: "FULL",
    });
    // (100 - 20) = 80
    // 80 + (80 * 0.015) = 80 + 1.2 = 81.2
    expect(total).toBe(81.2);
  });

  test("prevents negative total with large voucher", () => {
    const total = calculateBookingTotal({
      subtotal: 50,
      voucherDiscount: 100,
      paymentMethod: "CASH",
      paymentType: "FULL",
    });
    expect(total).toBe(0);
  });
});
