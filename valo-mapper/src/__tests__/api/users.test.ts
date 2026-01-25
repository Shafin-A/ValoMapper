import { POST } from "@/app/api/users/route";

describe("POST /api/users", () => {
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

  it("should create user successfully with auth header", async () => {
    const mockUserData = {
      uid: "user123",
      displayName: "Test User",
      email: "test@example.com",
    };

    const mockRequest = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify(mockUserData),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserData,
    });

    const responsePromise = POST(mockRequest);
    jest.runAllTimers();

    const response = await responsePromise;
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      `${process.env.API_URL}/users`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        }),
        body: JSON.stringify(mockUserData),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(data).toEqual(mockUserData);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const mockRequest = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid: "test" }),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return 400 when request body is empty", async () => {
    const mockRequest = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify(null),
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "No request body" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should timeout after 30 seconds", async () => {
    const mockRequest = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ uid: "test" }),
    });

    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValueOnce(abortError);

    const responsePromise = POST(mockRequest);
    jest.advanceTimersByTime(30000);

    const response = await responsePromise;
    const data = await response.json();

    expect(response.status).toBe(504);
    expect(data).toEqual({ error: "Request timed out. Please try again." });
  });

  it("should handle backend errors", async () => {
    const mockRequest = new Request("http://localhost/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ uid: "test" }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const responsePromise = POST(mockRequest);
    jest.runAllTimers();

    const response = await responsePromise;
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to create user" });
  });
});
