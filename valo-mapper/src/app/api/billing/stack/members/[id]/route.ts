import { proxyToBackend } from "@/lib/api-proxy";

export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  return proxyToBackend(`/billing/stack/members/${id}`, {
    method: "DELETE",
    token: authHeader,
    errorMessage: "Failed to remove stack member",
  });
};
