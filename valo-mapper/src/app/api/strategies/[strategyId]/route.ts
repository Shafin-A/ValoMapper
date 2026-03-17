import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const DELETE = withAuthRequired(
  async (_request, { params }, authHeader) => {
    const { strategyId } = await params;
    return proxyToBackend(`/strategies/${strategyId}`, {
      method: "DELETE",
      token: authHeader,
      errorMessage: "Failed to delete strategy",
    });
  },
);

export const PATCH = withAuthRequired(
  async (request, { params }, authHeader) => {
    const { strategyId } = await params;
    const body = await request.json();
    if (!body)
      return Response.json({ error: "No request body" }, { status: 400 });

    return proxyToBackend(`/strategies/${strategyId}`, {
      method: "PATCH",
      token: authHeader,
      body,
      errorMessage: "Failed to update strategy",
    });
  },
);
