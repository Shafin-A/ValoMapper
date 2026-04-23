/**
 * Authentication middleware for Next.js API routes
 * Consolidates repeated authorization header validation across all protected endpoints
 */

/**
 * Wraps a Next.js API route handler to require authentication
 * Validates that the Authorization header is present before calling the handler
 * Supports both static routes and dynamic routes with params
 *
 * @param handler - The actual route handler that receives the auth header
 * @returns A wrapped handler that validates auth before proceeding
 *
 * @example
 * // Static route:
 * export const GET = withAuthRequired(async (request, authHeader) => {
 *   return proxyToBackend("/strategies", {
 *     method: "GET",
 *     token: authHeader,
 *   });
 * });
 *
 * // Dynamic route (Next.js context style):
 * export const DELETE = withAuthRequired(
 *   async (
 *     request: NextRequest,
 *     context: { params: Promise<{ strategyId: string }> },
 *     authHeader: string
 *   ) => {
 *     const { strategyId } = await context.params;
 *     return proxyToBackend(`/strategies/${strategyId}`, {
 *       method: "DELETE",
 *       token: authHeader,
 *     });
 *   }
 * );
 */

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

// Overload for static routes
export function withAuthRequired(
  handler: StaticAuthHandler,
): (request: Request) => Promise<Response>;

// Overload for dynamic routes with Next.js context
export function withAuthRequired<T extends Record<string, string>>(
  handler: DynamicAuthHandler<T>,
): (request: Request, context: { params: Promise<T> }) => Promise<Response>;

// Implementation
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
