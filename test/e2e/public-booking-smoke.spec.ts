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
      `INSERT INTO "Business" ("id", "name", "slug", "initials", "description")
       VALUES ($1, $2, $3, $4, $5)`,
      [
        businessId,
        businessName,
        businessSlug,
        "E2",
        "Deterministic smoke-test business",
      ],
    );

    await dbClient.query(
      `INSERT INTO "Service" ("name", "category", "price", "duration", "business_id")
       VALUES ($1, $2, $3, $4, $5)`,
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

    await page.getByRole("link", { name: "Book now" }).click();
    await expect(page).toHaveURL(new RegExp(`/${businessSlug}/booking`));

    const modalFlowVisible = await page
      .getByText("Secure booking")
      .first()
      .isVisible()
      .catch(() => false);

    if (modalFlowVisible) {
      await expect(page.getByText(`Book with ${businessName}`)).toBeVisible();
      await expect(
        page.getByText("Choose services, pick a time, and confirm your slot."),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole("heading", { name: "Complete your booking" }),
      ).toBeVisible();
    }

    await expect(page.getByText("Select Services")).toBeVisible();
    await expect(page.getByText("Booking Summary")).toBeVisible();
  });
});
