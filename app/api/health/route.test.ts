import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("Health Check API", () => {
  it("should return 200 OK", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
  });
});
