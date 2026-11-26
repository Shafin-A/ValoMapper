import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const POST = withAuthRequired(async (request, authHeader) => {
  const body = await request.json();
  if (!body) {
    return Response.json({ error: "No request body" }, { status: 400 });
  }

  return proxyToBackend("/strategies/bulk-delete", {
    method: "POST",
    token: authHeader,
    body,
    errorMessage: "Failed to delete strategies",
    request,
  });
});
