import { proxyToBackend } from "@/lib/api-proxy";

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) => {
  const { matchId } = await params;
  if (!matchId) {
    return Response.json({ error: "matchId is required" }, { status: 400 });
  }

  const requestUrl = new URL(request.url);
  const search = requestUrl.searchParams.toString();

  return proxyToBackend(
    `/matches/${encodeURIComponent(matchId)}/summary${search ? `?${search}` : ""}`,
    {
      method: "GET",
      token: request.headers.get("Authorization"),
      errorMessage: "Failed to fetch match summary",
      request,
    },
  );
};
