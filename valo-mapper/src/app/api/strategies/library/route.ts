import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const GET = withAuthRequired(async (request, authHeader) => {
  const search = new URL(request.url).search;
  return proxyToBackend(`/strategies/library${search}`, {
    method: "GET",
    token: authHeader,
    errorMessage: "Failed to search strategies",
    request,
  });
});
