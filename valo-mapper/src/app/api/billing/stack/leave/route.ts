import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const DELETE = withAuthRequired(async (request, authHeader) => {
  return proxyToBackend("/billing/stack/leave", {
    method: "DELETE",
    token: authHeader,
    errorMessage: "Failed to leave stack",
    request,
  });
});
