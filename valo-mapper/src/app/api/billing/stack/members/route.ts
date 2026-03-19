import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const GET = withAuthRequired(async (request, authHeader) => {
  return proxyToBackend("/billing/stack/members", {
    method: "GET",
    token: authHeader,
    errorMessage: "Failed to load stack members",
    request,
  });
});
