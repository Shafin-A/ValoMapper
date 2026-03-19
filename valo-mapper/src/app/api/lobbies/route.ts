import { proxyToBackend } from "@/lib/api-proxy";

export const POST = async (request: Request) => {
  return proxyToBackend("/lobbies", {
    method: "POST",
    errorMessage: "Failed to create lobby",
    request,
  });
};
