type StaticAuthHandler = (
  request: Request,
  authHeader: string,
) => Promise<Response> | Response;

type DynamicAuthHandler<
  T extends Record<string, string> = Record<string, string>,
> = (
  request: Request,
  context: { params: Promise<T> },
  authHeader: string,
) => Promise<Response> | Response;

const isInvalidTokenValue = (token: string): boolean => {
  const lowered = token.toLowerCase();
  return (
    lowered === "undefined" ||
    lowered === "null" ||
    lowered === "[object object]"
  );
};

const normalizeAuthHeader = (authHeader: string | null): string | null => {
  if (!authHeader) {
    return null;
  }

  const trimmed = authHeader.trim();
  if (!trimmed) {
    return null;
  }

  const bearerMatch = /^Bearer\s+(.+)$/i.exec(trimmed);
  if (bearerMatch) {
    const token = bearerMatch[1].trim();
    if (!token || /\s/.test(token) || isInvalidTokenValue(token)) {
      return null;
    }
    return `Bearer ${token}`;
  }

  if (/\s/.test(trimmed) || isInvalidTokenValue(trimmed)) {
    return null;
  }

  return `Bearer ${trimmed}`;
};

export function withAuthRequired(
  handler: StaticAuthHandler,
): (request: Request) => Promise<Response>;

export function withAuthRequired<T extends Record<string, string>>(
  handler: DynamicAuthHandler<T>,
): (request: Request, context: { params: Promise<T> }) => Promise<Response>;

export function withAuthRequired<
  T extends Record<string, string> = Record<string, string>,
>(handler: StaticAuthHandler | DynamicAuthHandler<T>) {
  const expectsDynamicParam = handler.length >= 3;

  if (expectsDynamicParam) {
    return async (
      request: Request,
      context: { params: Promise<T> },
    ): Promise<Response> => {
      const authHeader = normalizeAuthHeader(
        request.headers.get("Authorization"),
      );

      if (!authHeader) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      return (handler as DynamicAuthHandler<T>)(request, context, authHeader);
    };
  }

  return async (request: Request): Promise<Response> => {
    const authHeader = normalizeAuthHeader(
      request.headers.get("Authorization"),
    );

    if (!authHeader) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return (handler as StaticAuthHandler)(request, authHeader);
  };
}
