import { proxyToBackend } from "@/lib/api-proxy";

export const POST = async () => {
  return proxyToBackend("/lobbies", {
    method: "POST",
    errorMessage: "Failed to create lobby",
  });
};
