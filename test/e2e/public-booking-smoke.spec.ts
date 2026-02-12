import { expect, test } from "@playwright/test";
import "dotenv/config";
import { Client } from "pg";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const businessSlug = `e2e-booking-${Date.now()}`;
const businessName = "E2E Booking Salon";
const businessId = `e2e_${Date.now()}`;
let dbClient: Client | null = null;
let dbReady = false;

test.describe("Public booking smoke", () => {
  test.skip(!hasDatabase, "DATABASE_URL is required for booking smoke E2E.");

  test.beforeAll(async () => {
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await dbClient.connect();
    dbReady = true;

    await dbClient.query(
      `INSERT INTO "Business" ("id", "name", "slug", "initials", "description", "created_at", "updated_at")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [
        businessId,
        businessName,
        businessSlug,
        "E2",
        "Deterministic smoke-test business",
      ],
    );

    await dbClient.query(
      `INSERT INTO "Service" ("name", "category", "price", "duration", "business_id", "created_at", "updated_at")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      ["E2E Signature Service", "GENERAL", 799, 45, businessId],
    );
  });

  test.afterAll(async () => {
    if (!dbClient || !dbReady) return;
    await dbClient.query(`DELETE FROM "Business" WHERE "slug" = $1`, [
      businessSlug,
    ]);
    await dbClient.end();
    dbClient = null;
  });

  test("opens business page and reaches booking screen", async ({ page }) => {
    await page.goto(`/${businessSlug}`);
    await expect(page.getByRole("heading", { name: businessName })).toBeVisible();

    const bookNowLink = page.locator(`a[href='/${businessSlug}/booking']`).first();
    await expect(bookNowLink).toBeVisible();
    await bookNowLink.click();

    const selectServicesHeading = page.getByRole("heading", {
      name: "Select Services",
    });
    const modalBadge = page.getByText("Secure booking").first();
    const fullPageHeading = page.getByRole("heading", {
      name: "Complete your booking",
    });

    await Promise.race([
      selectServicesHeading.waitFor({ state: "visible", timeout: 10_000 }),
      modalBadge.waitFor({ state: "visible", timeout: 10_000 }),
      fullPageHeading.waitFor({ state: "visible", timeout: 10_000 }),
    ]);

    const modalFlowVisible = await modalBadge.isVisible().catch(() => false);

    if (modalFlowVisible) {
      await expect(page.getByText(`Book with ${businessName}`)).toBeVisible();
      await expect(
        page.getByText("Choose services, pick a time, and confirm your slot."),
      ).toBeVisible();
    } else {
      await expect(fullPageHeading).toBeVisible();
    }

    await expect(selectServicesHeading).toBeVisible();
    await expect(page.getByText("Booking Summary", { exact: true })).toBeVisible();
  });
});
