import { expect, test } from "@playwright/test";

const privateRoutes = [
  "/app",
  "/app/demo-business",
  "/app/demo-business/bookings",
  "/app/demo-business/sale-events",
];

test.describe("Private route protection", () => {
  test("redirects unauthenticated users from app routes", async ({ page }) => {
    for (const route of privateRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/$/);
    }
  });
});
