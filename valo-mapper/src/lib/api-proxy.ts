import { normalizeAuthToken } from "./auth-token";
import { fetchBackendWithTimeout } from "./backend-fetch";

interface ProxyOptions {
  method: string;
  token?: unknown;
  body?: unknown;
  errorMessage: string;
  request?: Request;
}

const FORWARDED_HEADER_NAMES = [
  "x-forwarded-for",
  "x-real-ip",
  "fly-client-ip",
];

const getForwardedHeaders = (request?: Request): Record<string, string> => {
  if (!request) {
    return {};
  }

  const forwardedHeaders: Record<string, string> = {};

  for (const headerName of FORWARDED_HEADER_NAMES) {
    const headerValue = request.headers.get(headerName);
    if (headerValue && headerValue.trim() !== "") {
      forwardedHeaders[headerName] = headerValue;
    }
  }

  return forwardedHeaders;
};

export const proxyToBackend = async (
  path: string,
  { method, token, body, errorMessage, request }: ProxyOptions,
): Promise<Response> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getForwardedHeaders(request),
  };

  if (token !== undefined && token !== null) {
    const normalizedToken = normalizeAuthToken(token);
    if (!normalizedToken) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    headers["Authorization"] = `Bearer ${normalizedToken}`;
  }

  try {
    const backendResponse = await fetchBackendWithTimeout(path, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!backendResponse.ok) {
      let errorMsg = errorMessage;
      try {
        const errorData = await backendResponse.json();
        if (
          errorData?.error &&
          typeof errorData.error === "string" &&
          errorData.error.trim() !== ""
        ) {
          errorMsg = errorData.error;
        }
      } catch {
        // fall back to generic error message
      }
      return Response.json(
        { error: errorMsg },
        { status: backendResponse.status },
      );
    }

    if (backendResponse.status === 204) {
      return Response.json({ success: true });
    }

    try {
      const data = await backendResponse.json();
      return Response.json(data);
    } catch {
      return Response.json({ success: true });
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return Response.json(
        { error: "Request timed out. Please try again." },
        { status: 504 },
      );
    }
    throw error;
  }
};
