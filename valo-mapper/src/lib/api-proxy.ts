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
  "cf-connecting-ip",
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

const isInvalidTokenValue = (value: string): boolean => {
  const lowered = value.toLowerCase();
  return (
    lowered === "undefined" ||
    lowered === "null" ||
    lowered === "[object object]"
  );
};

const normalizeAuthorizationHeader = (token: unknown): string | null => {
  if (typeof token !== "string") {
    return null;
  }

  const trimmed = token.trim();
  if (!trimmed || isInvalidTokenValue(trimmed)) {
    return null;
  }

  const bearerMatch = /^bearer\s+(.+)$/i.exec(trimmed);
  if (bearerMatch) {
    const bearerToken = bearerMatch[1].trim();
    if (
      !bearerToken ||
      /\s/.test(bearerToken) ||
      isInvalidTokenValue(bearerToken)
    ) {
      return null;
    }

    return `Bearer ${bearerToken}`;
  }

  if (/\s/.test(trimmed)) {
    return null;
  }

  return `Bearer ${trimmed}`;
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
    const normalizedAuthHeader = normalizeAuthorizationHeader(token);
    if (!normalizedAuthHeader) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    headers["Authorization"] = normalizedAuthHeader;
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
