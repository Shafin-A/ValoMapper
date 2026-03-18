import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const GET = withAuthRequired(async (_request, authHeader) => {
  return proxyToBackend("/billing/stack/pending-invites", {
    method: "GET",
    token: authHeader,
    errorMessage: "Failed to load pending stack invites",
  });
});
