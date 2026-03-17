import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const POST = withAuthRequired(
  async (_request, { params }, authHeader) => {
    const { id } = await params;

    return proxyToBackend(`/billing/stack/accept/${id}`, {
      method: "POST",
      token: authHeader,
      errorMessage: "Failed to accept stack invite",
    });
  },
);
