import { proxyToBackend } from "@/lib/api-proxy";

export const GET = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  return proxyToBackend("/folders", {
    method: "GET",
    token: authHeader,
    errorMessage: "Failed to fetch folders",
  });
};

export const POST = async (request: Request) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body)
    return Response.json({ error: "No request body" }, { status: 400 });

  return proxyToBackend("/folders", {
    method: "POST",
    token: authHeader,
    body,
    errorMessage: "Failed to create folder",
  });
};
