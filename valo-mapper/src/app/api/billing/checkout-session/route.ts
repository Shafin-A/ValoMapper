import { proxyToBackend } from "@/lib/api-proxy";

export const POST = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  let requestBody: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.trim() !== "") {
      requestBody = JSON.parse(rawBody);
    }
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  return proxyToBackend("/billing/checkout-session", {
    method: "POST",
    token: authHeader,
    body: requestBody,
    errorMessage: "Failed to create checkout session",
  });
};
