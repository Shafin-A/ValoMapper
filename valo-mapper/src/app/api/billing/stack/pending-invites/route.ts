import { proxyToBackend } from "@/lib/api-proxy";

export const GET = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  return proxyToBackend("/billing/stack/pending-invites", {
    method: "GET",
    token: authHeader,
    errorMessage: "Failed to load pending stack invites",
  });
};
