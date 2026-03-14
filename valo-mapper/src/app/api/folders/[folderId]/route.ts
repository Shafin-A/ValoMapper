import { proxyToBackend } from "@/lib/api-proxy";

export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ folderId: string }> },
) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { folderId } = await params;
  return proxyToBackend(`/folders/${folderId}`, {
    method: "DELETE",
    token: authHeader,
    errorMessage: "Failed to delete folder",
  });
};

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ folderId: string }> },
) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { folderId } = await params;
  const body = await request.json();
  if (!body)
    return Response.json({ error: "No request body" }, { status: 400 });

  return proxyToBackend(`/folders/${folderId}`, {
    method: "PATCH",
    token: authHeader,
    body,
    errorMessage: "Failed to update folder",
  });
};
