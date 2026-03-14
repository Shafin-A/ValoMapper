interface ProxyOptions {
  method: string;
  token?: string | null;
  body?: unknown;
  errorMessage: string;
}

export const proxyToBackend = async (
  path: string,
  { method, token, body, errorMessage }: ProxyOptions,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = token;
  }

  try {
    const backendResponse = await fetch(`${process.env.API_URL}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return Response.json(
        { error: "Request timed out. Please try again." },
        { status: 504 },
      );
    }
    throw error;
  }
};
