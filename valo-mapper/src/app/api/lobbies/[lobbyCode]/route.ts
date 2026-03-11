export const GET = async (
  request: Request,
  { params }: { params: Promise<{ lobbyCode: string }> },
) => {
  const { lobbyCode } = await params;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `${process.env.API_URL}/lobbies/${lobbyCode}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return Response.json(
        {
          error:
            response.status === 404
              ? "Lobby not found"
              : "Failed to fetch lobby",
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return Response.json(
        { error: "Request timed out. Please try again." },
        { status: 504 },
      );
    }
    throw error;
  }
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ lobbyCode: string }> },
) => {
  const { lobbyCode } = await params;

  const body = await request.json();

  if (!body) {
    return Response.json({ error: "No request body" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `${process.env.API_URL}/lobbies/${lobbyCode}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return Response.json(
        { error: "Failed to update lobby" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return Response.json(
        { error: "Request timed out. Please try again." },
        { status: 504 },
      );
    }
    throw error;
  }
};
