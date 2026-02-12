import { expect, test } from "@playwright/test";

const adminRoutes = [
  "/platform",
  "/platform/overview",
  "/platform/applications",
  "/platform/businesses",
  "/platform/outbox",
  "/platform/plans",
  "/platform/invoices",
  "/platform/referrals",
  "/platform/audit",
];

test.describe("Platform admin route protection", () => {
  test("redirects unauthenticated users from all admin routes", async ({ page }) => {
    for (const route of adminRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/$/);
    }
  });
});
