import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const POST = withAuthRequired(async (request, authHeader) => {
  return proxyToBackend("/billing/resume-subscription", {
    method: "POST",
    token: authHeader,
    errorMessage: "Failed to resume subscription",
    request,
  });
});
