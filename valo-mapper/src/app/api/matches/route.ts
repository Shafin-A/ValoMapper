import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const GET = withAuthRequired(async (request, authHeader) => {
  const url = new URL(request.url);
  const start = url.searchParams.get("start");
  const limit = url.searchParams.get("limit");
  const searchParams = new URLSearchParams();

  if (start) {
    searchParams.set("start", start);
  }

  if (limit) {
    searchParams.set("limit", limit);
  }

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : "";

  return proxyToBackend(`/matches${query}`, {
    method: "GET",
    token: authHeader,
    errorMessage: "Failed to fetch matches",
    request,
  });
});
