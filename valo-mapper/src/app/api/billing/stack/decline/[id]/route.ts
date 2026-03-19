import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const POST = withAuthRequired(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
    authHeader: string,
  ) => {
    const { id } = await params;

    return proxyToBackend(`/billing/stack/decline/${id}`, {
      method: "POST",
      token: authHeader,
      errorMessage: "Failed to decline stack invite",
      request,
    });
  },
);
