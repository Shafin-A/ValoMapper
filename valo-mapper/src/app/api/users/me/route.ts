import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const GET = withAuthRequired(async (request, authHeader) => {
  return proxyToBackend("/users/me", {
    method: "GET",
    token: authHeader,
    errorMessage: "Failed to fetch user",
    request,
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
    request,
  });
});

export const DELETE = withAuthRequired(async (request, authHeader) => {
  return proxyToBackend("/users/me", {
    method: "DELETE",
    token: authHeader,
    errorMessage: "Failed to delete user",
    request,
  });
});
