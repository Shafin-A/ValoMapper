import { withAuthRequired } from "@/lib/api-middleware";
import { proxyToBackend } from "@/lib/api-proxy";

export const DELETE = withAuthRequired(
  async (_request, { params }, authHeader) => {
    const { folderId } = await params;
    return proxyToBackend(`/folders/${folderId}`, {
      method: "DELETE",
      token: authHeader,
      errorMessage: "Failed to delete folder",
    });
  },
);

export const PATCH = withAuthRequired(
  async (request, { params }, authHeader) => {
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
  },
);
