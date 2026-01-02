import { POST } from "@/app/api/lobbies/route";

describe("POST /api/lobbies", () => {
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

  it("should create lobby successfully", async () => {
    const mockResponse = {
      lobbyCode: "ABC123",
      createdAt: new Date().toISOString(),
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const responsePromise = POST();

    jest.runAllTimers();

    const response = await responsePromise;
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      `${process.env.API_URL}/lobbies`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: expect.any(AbortSignal),
      })
    );
    expect(data).toEqual(mockResponse);
  });

  it("should return error when backend fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const responsePromise = POST();
    jest.runAllTimers();

    const response = await responsePromise;
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to create lobby" });
  });

  it("should timeout after 30 seconds", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";

    mockFetch.mockRejectedValueOnce(abortError);

    const responsePromise = POST();

    jest.advanceTimersByTime(30000);

    const response = await responsePromise;
    const data = await response.json();

    expect(response.status).toBe(504);
    expect(data).toEqual({ error: "Request timed out. Please try again." });
  });

  it("should handle abort error correctly", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";

    mockFetch.mockRejectedValueOnce(abortError);

    const responsePromise = POST();
    jest.runAllTimers();

    const response = await responsePromise;
    const data = await response.json();

    expect(response.status).toBe(504);
    expect(data).toEqual({ error: "Request timed out. Please try again." });
  });

  it("should clear timeout on successful response", async () => {
    const mockResponse = { lobbyCode: "XYZ789" };
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const responsePromise = POST();
    jest.runAllTimers();

    await responsePromise;

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("should clear timeout on error response", async () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const responsePromise = POST();
    jest.runAllTimers();

    await responsePromise;

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("should use AbortController signal in fetch", async () => {
    let capturedSignal: AbortSignal | undefined;

    mockFetch.mockImplementationOnce((url, options) => {
      capturedSignal = options?.signal;
      return Promise.resolve({
        ok: true,
        json: async () => ({ lobbyCode: "TEST" }),
      });
    });

    const responsePromise = POST();
    jest.runAllTimers();

    await responsePromise;

    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });
});
