import { GET as getImageObject } from "@/app/api/images/object/route";
import { POST as uploadImage } from "@/app/api/images/upload/route";

const API_URL = process.env.API_URL;

const originalFetch = global.fetch;
let mockFetch: jest.Mock;

const createUploadRequest = (
  contentType = "multipart/form-data; boundary=abc",
  headers: Record<string, string> = {},
) => {
  const request = new Request("http://localhost/api/images/upload", {
    method: "POST",
    headers: { "Content-Type": contentType, ...headers },
  });

  (request as unknown as { arrayBuffer: () => Promise<ArrayBuffer> })
    .arrayBuffer = async () => new TextEncoder().encode("image-bytes").buffer;

  return request;
};

beforeEach(() => {
  mockFetch = jest.fn();
  global.fetch = mockFetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("GET /api/images/object", () => {
  it("rejects requests without a key", async () => {
    const response = await getImageObject(
      new Request("http://localhost/api/images/object"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Missing image key" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("streams the backend image through", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: "image-bytes",
      headers: {
        get: (name: string) =>
          name === "content-type"
            ? "image/png"
            : "public, max-age=31536000, immutable",
      },
    });

    const response = await getImageObject(
      new Request("http://localhost/api/images/object?key=images%2Fa%20b.png"),
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/images/object?key=images%2Fa%20b.png`,
      expect.objectContaining({ method: "GET", signal: expect.anything() }),
    );
    expect(response.status).toBe(200);
    expect(response.body).toBe("image-bytes");
  });

  it("passes backend image errors through", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Image not found" }),
    });

    const response = await getImageObject(
      new Request("http://localhost/api/images/object?key=missing.png"),
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "Image not found" });
  });

  it("falls back to a generic image error for malformed payloads", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    });

    const response = await getImageObject(
      new Request("http://localhost/api/images/object?key=broken.png"),
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data).toEqual({ error: "Failed to fetch image" });
  });

  it("returns 504 when the image request aborts", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValueOnce(abortError);

    const response = await getImageObject(
      new Request("http://localhost/api/images/object?key=slow.png"),
    );
    const data = await response.json();

    expect(response.status).toBe(504);
    expect(data).toEqual({ error: "Request timed out" });
  });
});

describe("POST /api/images/upload", () => {
  it("requires multipart form data", async () => {
    const response = await uploadImage(createUploadRequest("application/json"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Expected multipart/form-data" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("uploads the raw body with forwarded client headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ key: "uploads/a b.png", width: 100 }),
    });

    const response = await uploadImage(
      createUploadRequest("multipart/form-data; boundary=xyz", {
        "X-Forwarded-For": "203.0.113.7",
        "X-Real-Ip": "203.0.113.7",
      }),
    );
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/images/upload`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "multipart/form-data; boundary=xyz",
          "x-forwarded-for": "203.0.113.7",
          "x-real-ip": "203.0.113.7",
        }),
        signal: expect.anything(),
      }),
    );
    expect(data).toEqual({
      key: "uploads/a b.png",
      width: 100,
      url: "/api/images/object?key=uploads%2Fa%20b.png",
    });
  });

  it("leaves responses without a key untouched", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    const response = await uploadImage(createUploadRequest());
    const data = await response.json();

    expect(data).toEqual({ success: true });
  });

  it("passes upload errors through", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 413,
      json: async () => ({ error: "Image too large" }),
    });

    const response = await uploadImage(createUploadRequest());
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data).toEqual({ error: "Image too large" });
  });

  it("returns 504 when the upload aborts", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValueOnce(abortError);

    const response = await uploadImage(createUploadRequest());
    const data = await response.json();

    expect(response.status).toBe(504);
    expect(data).toEqual({ error: "Upload timed out" });
  });
});
