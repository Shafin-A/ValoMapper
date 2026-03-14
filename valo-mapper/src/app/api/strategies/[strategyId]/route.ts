import { proxyToBackend } from "@/lib/api-proxy";

export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ strategyId: string }> },
) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { strategyId } = await params;
  return proxyToBackend(`/strategies/${strategyId}`, {
    method: "DELETE",
    token: authHeader,
    errorMessage: "Failed to delete strategy",
  });
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ strategyId: string }> },
) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

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
};
