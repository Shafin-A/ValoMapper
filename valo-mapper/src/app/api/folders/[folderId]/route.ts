export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) => {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folderId } = await params;

  const response = await fetch(`${process.env.API_URL}/folders/${folderId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    return Response.json(
      { error: "Failed to delete folder" },
      { status: response.status }
    );
  }

  return Response.json({ success: true });
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) => {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folderId } = await params;

  const body = await request.json();

  if (!body) {
    return Response.json({ error: "No request body" }, { status: 400 });
  }

  const response = await fetch(`${process.env.API_URL}/folders/${folderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return Response.json(
      { error: "Failed to update folder" },
      { status: response.status }
    );
  }

  const data = await response.json();
  return Response.json(data);
};
