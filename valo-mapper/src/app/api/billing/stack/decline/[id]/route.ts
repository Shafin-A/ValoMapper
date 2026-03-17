import { proxyToBackend } from "@/lib/api-proxy";

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  return proxyToBackend(`/billing/stack/decline/${id}`, {
    method: "POST",
    token: authHeader,
    errorMessage: "Failed to decline stack invite",
  });
};
