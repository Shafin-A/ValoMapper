import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const GET = withAuthRequired(async (request, authHeader) => {
  return proxyToBackend("/strategies", {
    method: "GET",
    token: authHeader,
    errorMessage: "Failed to fetch strategies",
    request,
  });
});

export const POST = withAuthRequired(async (request, authHeader) => {
  const body = await request.json();
  if (!body)
    return Response.json({ error: "No request body" }, { status: 400 });

  return proxyToBackend("/strategies", {
    method: "POST",
    token: authHeader,
    body,
    errorMessage: "Failed to create strategy",
    request,
  });
});
