import { proxyToBackend } from "@/lib/api-proxy";

export const GET = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  return proxyToBackend("/users/me", {
    method: "GET",
    token: authHeader,
    errorMessage: "Failed to fetch user",
  });
};

export const PUT = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body)
    return Response.json({ error: "No request body" }, { status: 400 });

  return proxyToBackend("/users/me", {
    method: "PUT",
    token: authHeader,
    body,
    errorMessage: "Failed to update user",
  });
};

export const DELETE = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  return proxyToBackend("/users/me", {
    method: "DELETE",
    token: authHeader,
    errorMessage: "Failed to delete user",
  });
};
