import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const POST = withAuthRequired(
  async (
    request: Request,
    { params }: { params: Promise<{ strategyId: string }> },
    authHeader: string,
  ) => {
    const { strategyId } = await params;
    return proxyToBackend(`/strategies/${strategyId}/duplicate`, {
      method: "POST",
      token: authHeader,
      errorMessage: "Failed to duplicate strategy",
      request,
    });
  },
);
