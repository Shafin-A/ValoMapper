import { proxyToBackend } from "@/lib/api-proxy";

describe("proxyToBackend authorization normalization", () => {
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    jest.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it("forwards normalized bearer token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const responsePromise = proxyToBackend("/users/me", {
      method: "GET",
      token: "raw-token",
      errorMessage: "Failed",
    });

    jest.runAllTimers();
    const response = await responsePromise;
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      `${process.env.API_URL}/users/me`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer raw-token",
        }),
      }),
    );
    expect(data).toEqual({ ok: true });
  });

  it("rejects object-like header value before backend call", async () => {
    const response = await proxyToBackend("/users/me", {
      method: "GET",
      token: "[object Object]",
      errorMessage: "Failed",
    });

    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects malformed bearer object-like value before backend call", async () => {
    const response = await proxyToBackend("/users/me", {
      method: "GET",
      token: "Bearer [object Object]",
      errorMessage: "Failed",
    });

    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
