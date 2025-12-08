export const GET = async (
  request: Request,
  { params }: { params: Promise<{ lobbyCode: string }> }
) => {
  const { lobbyCode } = await params;

  const response = await fetch(`${process.env.API_URL}/lobbies/${lobbyCode}`);

  if (!response.ok) {
    return Response.json(
      {
        error:
          response.status === 404 ? "Lobby not found" : "Failed to fetch lobby",
      },
      { status: response.status }
    );
  }

  const data = await response.json();
  return Response.json(data);
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ lobbyCode: string }> }
) => {
  const { lobbyCode } = await params;

  const body = await request.json();

  const response = await fetch(`${process.env.API_URL}/lobbies/${lobbyCode}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return Response.json(
      { error: "Failed to update lobby" },
      { status: response.status }
    );
  }

  const data = await response.json();
  return Response.json(data);
};
