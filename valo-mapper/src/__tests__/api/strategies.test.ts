import { GET, POST } from "@/app/api/strategies/route";

describe("Strategies API Routes", () => {
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

  describe("GET /api/strategies", () => {
    it("should fetch strategies successfully", async () => {
      const mockStrategies = [
        { id: "1", name: "Strategy 1", mapId: "ascent" },
        { id: "2", name: "Strategy 2", mapId: "bind" },
      ];

      const mockRequest = new Request("http://localhost/api/strategies", {
        method: "GET",
        headers: {
          Authorization: "Bearer test-token",
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStrategies,
      });

      const responsePromise = GET(mockRequest);
      jest.runAllTimers();

      const response = await responsePromise;
      const data = await response.json();

      expect(data).toEqual(mockStrategies);
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.API_URL}/strategies`,
        expect.objectContaining({
          method: "GET",
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it("should return 401 when unauthorized", async () => {
      const mockRequest = new Request("http://localhost/api/strategies", {
        method: "GET",
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should timeout after 30 seconds", async () => {
      const mockRequest = new Request("http://localhost/api/strategies", {
        method: "GET",
        headers: {
          Authorization: "Bearer test-token",
        },
      });

      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortError);

      const responsePromise = GET(mockRequest);
      jest.advanceTimersByTime(30000);

      const response = await responsePromise;
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data).toEqual({ error: "Request timed out. Please try again." });
    });
  });

  describe("POST /api/strategies", () => {
    it("should create strategy successfully", async () => {
      const newStrategy = {
        name: "New Strategy",
        mapId: "haven",
        canvasData: {},
      };

      const mockRequest = new Request("http://localhost/api/strategies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify(newStrategy),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "3", ...newStrategy }),
      });

      const responsePromise = POST(mockRequest);
      jest.runAllTimers();

      const response = await responsePromise;
      const data = await response.json();

      expect(data).toEqual({ id: "3", ...newStrategy });
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.API_URL}/strategies`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(newStrategy),
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it("should return 400 when request body is missing", async () => {
      const mockRequest = new Request("http://localhost/api/strategies", {
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
    });

    it("should handle backend errors", async () => {
      const mockRequest = new Request("http://localhost/api/strategies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({ name: "Test" }),
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
      expect(data).toEqual({ error: "Failed to create strategy" });
    });

    it("should pass through backend entitlement errors", async () => {
      const mockRequest = new Request("http://localhost/api/strategies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({ name: "Test" }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error:
            "Free plan limit reached (1 saved strategy). Upgrade to ValoMapper Premium for unlimited saves.",
        }),
      });

      const responsePromise = POST(mockRequest);
      jest.runAllTimers();

      const response = await responsePromise;
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error:
          "Free plan limit reached (1 saved strategy). Upgrade to ValoMapper Premium for unlimited saves.",
      });
    });
  });
});
