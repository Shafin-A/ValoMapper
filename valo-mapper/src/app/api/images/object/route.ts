import { fetchBackendWithTimeout } from "@/lib/backend-fetch";

export const GET = async (request: Request): Promise<Response> => {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return Response.json({ error: "Missing image key" }, { status: 400 });
  }

  try {
    const backendResponse = await fetchBackendWithTimeout(
      `/api/images/object?key=${encodeURIComponent(key)}`,
      {
        method: "GET",
      },
    );

    if (!backendResponse.ok) {
      let errorMsg = "Failed to fetch image";
      try {
        const err = await backendResponse.json();
        if (err?.error && typeof err.error === "string") {
          errorMsg = err.error;
        }
      } catch {
        // fall back to generic message
      }
      return Response.json(
        { error: errorMsg },
        { status: backendResponse.status },
      );
    }

    return new Response(backendResponse.body, {
      status: 200,
      headers: {
        "Content-Type":
          backendResponse.headers.get("content-type") ??
          "application/octet-stream",
        "Cache-Control":
          backendResponse.headers.get("cache-control") ??
          "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return Response.json({ error: "Request timed out" }, { status: 504 });
    }
    throw error;
  }
};
