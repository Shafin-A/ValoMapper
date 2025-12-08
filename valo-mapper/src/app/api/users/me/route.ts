export const GET = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = await fetch(`${process.env.API_URL}/users/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    return Response.json(
      { error: "Failed to fetch user" },
      { status: response.status }
    );
  }

  const data = await response.json();
  return Response.json(data);
};

export const PUT = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body) {
    return Response.json({ error: "No request body" }, { status: 400 });
  }

  const response = await fetch(`${process.env.API_URL}/users/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return Response.json(
      { error: "Failed to update user" },
      { status: response.status }
    );
  }

  const data = await response.json();
  return Response.json(data);
};

export const DELETE = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = await fetch(`${process.env.API_URL}/users/me`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    return Response.json(
      { error: "Failed to delete user" },
      { status: response.status }
    );
  }

  return Response.json({ success: true });
};
