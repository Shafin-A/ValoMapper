import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const GET = withAuthRequired(async (request, authHeader) => {
  return proxyToBackend("/strategies/tags", {
    method: "GET",
    token: authHeader,
    errorMessage: "Failed to fetch strategy tags",
    request,
  });
});
