import { GET, POST } from "@/app/api/folders/route";

describe("Folders API Routes", () => {
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

  describe("GET /api/folders", () => {
    it("should fetch folders successfully", async () => {
      const mockFolders = [
        { id: "1", name: "Folder 1" },
        { id: "2", name: "Folder 2" },
      ];

      const mockRequest = new Request("http://localhost/api/folders", {
        method: "GET",
        headers: {
          Authorization: "Bearer test-token",
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFolders,
      });

      const responsePromise = GET(mockRequest);
      jest.runAllTimers();

      const response = await responsePromise;
      const data = await response.json();

      expect(data).toEqual(mockFolders);
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.API_URL}/folders`,
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it("should timeout on slow backend", async () => {
      const mockRequest = new Request("http://localhost/api/folders", {
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

  describe("POST /api/folders", () => {
    it("should create folder successfully", async () => {
      const newFolder = { name: "New Folder" };

      const mockRequest = new Request("http://localhost/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify(newFolder),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "3", ...newFolder }),
      });

      const responsePromise = POST(mockRequest);
      jest.runAllTimers();

      const response = await responsePromise;
      const data = await response.json();

      expect(data).toEqual({ id: "3", ...newFolder });
    });

    it("should clear timeout on successful creation", async () => {
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

      const mockRequest = new Request("http://localhost/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({ name: "Test" }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "1", name: "Test" }),
      });

      const responsePromise = POST(mockRequest);
      jest.runAllTimers();

      await responsePromise;

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
