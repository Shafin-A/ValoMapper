import { proxyToBackend } from "@/lib/api-proxy";

export const POST = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  return proxyToBackend("/billing/checkout-session", {
    method: "POST",
    token: authHeader,
    errorMessage: "Failed to create checkout session",
  });
};
