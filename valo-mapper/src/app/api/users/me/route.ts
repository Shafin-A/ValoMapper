import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const GET = withAuthRequired(async (_request, authHeader) => {
  return proxyToBackend("/users/me", {
    method: "GET",
    token: authHeader,
    errorMessage: "Failed to fetch user",
  });
});

export const PUT = withAuthRequired(async (request, authHeader) => {
  const body = await request.json();
  if (!body)
    return Response.json({ error: "No request body" }, { status: 400 });

  return proxyToBackend("/users/me", {
    method: "PUT",
    token: authHeader,
    body,
    errorMessage: "Failed to update user",
  });
});

export const DELETE = withAuthRequired(async (_request, authHeader) => {
  return proxyToBackend("/users/me", {
    method: "DELETE",
    token: authHeader,
    errorMessage: "Failed to delete user",
  });
});
