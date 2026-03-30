import { proxyToBackend } from "@/lib/api-proxy";

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ lobbyCode: string }> },
) => {
  const { lobbyCode } = await params;
  const body = await request.json();
  if (!body)
    return Response.json({ error: "No request body" }, { status: 400 });

  return proxyToBackend(`/lobbies/${lobbyCode}/canvas-patches`, {
    method: "POST",
    body,
    errorMessage: "Failed to apply canvas patch",
    request,
  });
};
