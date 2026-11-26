import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const PATCH = withAuthRequired(async (request, authHeader) => {
  const body = await request.json();
  if (!body) {
    return Response.json({ error: "No request body" }, { status: 400 });
  }

  return proxyToBackend("/strategies/bulk", {
    method: "PATCH",
    token: authHeader,
    body,
    errorMessage: "Failed to update strategies",
    request,
  });
});
