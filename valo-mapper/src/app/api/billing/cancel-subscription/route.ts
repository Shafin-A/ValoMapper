import { proxyToBackend } from "@/lib/api-proxy";

export const POST = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  return proxyToBackend("/billing/cancel-subscription", {
    method: "POST",
    token: authHeader,
    errorMessage: "Failed to cancel subscription",
  });
};
