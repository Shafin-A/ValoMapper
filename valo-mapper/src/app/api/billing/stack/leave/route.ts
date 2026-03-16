import { proxyToBackend } from "@/lib/api-proxy";

export const DELETE = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  return proxyToBackend("/billing/stack/leave", {
    method: "DELETE",
    token: authHeader,
    errorMessage: "Failed to leave stack",
  });
};
