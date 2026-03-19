import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const DELETE = withAuthRequired(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
    authHeader: string,
  ) => {
    const { id } = await params;

    return proxyToBackend(`/billing/stack/members/${id}`, {
      method: "DELETE",
      token: authHeader,
      errorMessage: "Failed to remove stack member",
      request,
    });
  },
);
