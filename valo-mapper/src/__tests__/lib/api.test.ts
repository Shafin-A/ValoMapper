import { ApiError, apiFetch, apiFetchWithAuth } from "@/lib/api";

describe("api auth token normalization", () => {
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("adds Authorization header for raw token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await apiFetch<{ ok: boolean }>("/api/users/me", {
      method: "GET",
      token: "raw-token",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/users/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer raw-token",
        }),
      }),
    );
  });

  it("does not double-prefix bearer token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await apiFetch<{ ok: boolean }>("/api/users/me", {
      method: "GET",
      token: "Bearer already-prefixed-token",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/users/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer already-prefixed-token",
        }),
      }),
    );
  });

  it("rejects object-like tokens from getToken", async () => {
    await expect(
      apiFetchWithAuth<{ ok: boolean }>(
        "/api/users/me",
        async () => ({ foo: "bar" }) as unknown as string,
        { method: "GET" },
      ),
    ).rejects.toEqual(
      new ApiError("User not authenticated", 401, "Unauthorized"),
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects stringified object tokens", async () => {
    await expect(
      apiFetchWithAuth<{ ok: boolean }>(
        "/api/users/me",
        async () => "[object Object]",
        { method: "GET" },
      ),
    ).rejects.toEqual(
      new ApiError("User not authenticated", 401, "Unauthorized"),
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
