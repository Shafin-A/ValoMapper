import { getForwardedHeaders } from "@/lib/api-proxy";
import { fetchBackendWithTimeout } from "@/lib/backend-fetch";

export const POST = async (request: Request): Promise<Response> => {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.startsWith("multipart/form-data")) {
    return Response.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  try {
    const body = await request.arrayBuffer();

    const backendResponse = await fetchBackendWithTimeout(
      "/api/images/upload",
      {
        method: "POST",
        headers: {
          "Content-Type": contentType,
          ...getForwardedHeaders(request),
        },
        body,
      },
    );

    if (!backendResponse.ok) {
      let errorMsg = "Failed to upload image";
      try {
        const err = await backendResponse.json();
        if (err?.error && typeof err.error === "string") {
          errorMsg = err.error;
        }
      } catch {}
      return Response.json(
        { error: errorMsg },
        { status: backendResponse.status },
      );
    }

    const data = await backendResponse.json();
    if (data?.key && typeof data.key === "string") {
      data.url = `/api/images/object?key=${encodeURIComponent(data.key)}`;
    }
    return Response.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return Response.json({ error: "Upload timed out" }, { status: 504 });
    }
    throw error;
  }
};
