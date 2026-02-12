import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  buildPlatformErrorPath,
  buildPlatformSuccessPath,
  getPlatformFlashMessage,
  PlatformFlashNotice,
  toActionErrorMessage,
} from "./action-feedback";

describe("action-feedback", () => {
  it("builds encoded platform flash paths", () => {
    expect(buildPlatformErrorPath("/platform/businesses", "Owner email already exists")).toBe(
      "/platform/businesses?error=Owner+email+already+exists",
    );
    expect(buildPlatformSuccessPath("/platform/plans", "Plan updated")).toBe(
      "/platform/plans?success=Plan+updated",
    );
  });

  it("normalizes unknown errors to safe text", () => {
    expect(toActionErrorMessage(new Error("  Invalid payload  "))).toBe("Invalid payload");
    expect(toActionErrorMessage("  Something failed   ")).toBe("Something failed");
    expect(toActionErrorMessage(null)).toBe("We couldn't complete that action. Please try again.");
  });

  it("resolves error flash message before success", async () => {
    const flash = await getPlatformFlashMessage({
      error: "Invoice%20not%20found",
      success: "ignored",
    });

    expect(flash).toEqual({
      tone: "error",
      message: "Invoice not found",
    });
  });

  it("renders flash notice with tone styling", () => {
    const { rerender } = render(
      <PlatformFlashNotice flash={{ tone: "error", message: "Failed to update invoice." }} />,
    );
    expect(screen.getByRole("status")).toHaveClass("text-rose-800");

    rerender(<PlatformFlashNotice flash={{ tone: "success", message: "Invoice updated." }} />);
    expect(screen.getByRole("status")).toHaveClass("text-emerald-800");
  });
});
