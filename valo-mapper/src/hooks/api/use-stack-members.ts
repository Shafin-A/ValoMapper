import { useQuery } from "@tanstack/react-query";
import { apiFetchWithAuth, DEFAULT_RETRY_CONFIG } from "@/lib/api";
import { StackMembersResponse } from "@/lib/types";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export const useStackMembers = (enabled: boolean) => {
  const { getIdToken } = useFirebaseAuth();

  return useQuery<StackMembersResponse>({
    queryKey: ["stack-members"],
    queryFn: () =>
      apiFetchWithAuth<StackMembersResponse>(
        "/api/billing/stack/members",
        getIdToken,
      ),
    enabled,
    ...DEFAULT_RETRY_CONFIG,
  });
};
