import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetServerSession, mockHandleUpload } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockHandleUpload: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@vercel/blob/client", () => ({
  handleUpload: mockHandleUpload,
}));

import { POST } from "./route";

describe("upload route security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated uploads", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
    expect(mockHandleUpload).not.toHaveBeenCalled();
  });

  it("includes authenticated user context in upload token payload", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user_1", businessSlug: "beautyfeel" },
    });

    let tokenPayload = "";
    mockHandleUpload.mockImplementation(async (options) => {
      const token = await options.onBeforeGenerateToken();
      tokenPayload = token.tokenPayload;
      return { ok: true };
    });

    const response = await POST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockHandleUpload).toHaveBeenCalledTimes(1);
    expect(tokenPayload).toContain("user_1");
    expect(tokenPayload).toContain("beautyfeel");
  });
});
