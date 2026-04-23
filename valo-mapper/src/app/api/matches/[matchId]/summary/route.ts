import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const GET = withAuthRequired(
  async (
    request: Request,
    params: { matchId?: string },
    authHeader: string,
  ) => {
    const matchId = params?.matchId;
    if (!matchId) {
      return Response.json({ error: "matchId is required" }, { status: 400 });
    }

    return proxyToBackend(`/matches/${encodeURIComponent(matchId)}/summary`, {
      method: "GET",
      token: authHeader,
      errorMessage: "Failed to fetch match summary",
      request,
    });
  },
);
