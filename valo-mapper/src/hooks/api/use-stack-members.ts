import { useQuery } from "@tanstack/react-query";
import { apiFetch, DEFAULT_RETRY_CONFIG } from "@/lib/api";
import { StackMembersResponse } from "@/lib/types";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export const useStackMembers = (enabled: boolean) => {
  const { getIdToken } = useFirebaseAuth();

  return useQuery<StackMembersResponse>({
    queryKey: ["stack-members"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      return apiFetch<StackMembersResponse>("/api/billing/stack/members", {
        token,
      });
    },
    enabled,
    ...DEFAULT_RETRY_CONFIG,
  });
};
