import { proxyToBackend } from "@/lib/api-proxy";

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) => {
  // Debug: Check auth header
  const authHeader = request.headers.get("Authorization");
  console.log("DEBUG summary route - auth header present:", !!authHeader);

  if (!authHeader) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  console.log("DEBUG summary route - resolved params:", resolvedParams);
  const { matchId } = resolvedParams;
  console.log("DEBUG summary route - matchId:", matchId);

  if (!matchId) {
    return Response.json({ error: "matchId is required" }, { status: 400 });
  }

  return proxyToBackend(`/matches/${encodeURIComponent(matchId)}/summary`, {
    method: "GET",
    token: authHeader,
    errorMessage: "Failed to fetch match summary",
    request,
  });
};
