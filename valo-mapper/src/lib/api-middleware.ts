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
 * // Dynamic route:
 * export const DELETE = withAuthRequired(
 *   async (request, { params }, authHeader) => {
 *     const { strategyId } = await params;
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

type DynamicAuthHandler<T> = (
  request: Request,
  param: T,
  authHeader: string,
) => Promise<Response> | Response;

export function withAuthRequired(handler: StaticAuthHandler): (
  request: Request,
) => Promise<Response>;

export function withAuthRequired<T>(handler: DynamicAuthHandler<T>): (
  request: Request,
  param: T,
) => Promise<Response>;

export function withAuthRequired<T>(
  handler: StaticAuthHandler | DynamicAuthHandler<T>,
) {
  return async (request: Request, param?: T): Promise<Response> => {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call handler with param if it exists (dynamic routes), otherwise just request and authHeader
    if (param !== undefined) {
      return (handler as DynamicAuthHandler<T>)(request, param, authHeader);
    }
    return (handler as StaticAuthHandler)(request, authHeader);
  };
}
