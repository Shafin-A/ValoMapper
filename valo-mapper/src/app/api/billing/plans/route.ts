import { proxyToBackend } from "@/lib/api-proxy";

export const GET = async () => {
  return proxyToBackend("/billing/plans", {
    method: "GET",
    errorMessage: "Failed to fetch billing plans",
  });
};
