import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const GET = withAuthRequired(async (request, authHeader) => {
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");
  const query = limit ? `?limit=${encodeURIComponent(limit)}` : "";

  return proxyToBackend(`/matches${query}`, {
    method: "GET",
    token: authHeader,
    errorMessage: "Failed to fetch matches",
    request,
  });
});
