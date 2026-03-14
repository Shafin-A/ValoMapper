import { proxyToBackend } from "@/lib/api-proxy";

export const GET = async (
  _: Request,
  { params }: { params: Promise<{ lobbyCode: string }> },
) => {
  const { lobbyCode } = await params;
  return proxyToBackend(`/lobbies/${lobbyCode}`, {
    method: "GET",
    errorMessage: "Failed to fetch lobby",
  });
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ lobbyCode: string }> },
) => {
  const { lobbyCode } = await params;
  const body = await request.json();
  if (!body)
    return Response.json({ error: "No request body" }, { status: 400 });

  return proxyToBackend(`/lobbies/${lobbyCode}`, {
    method: "PATCH",
    body,
    errorMessage: "Failed to update lobby",
  });
};
