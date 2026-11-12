import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { apiFetchWithAuth, ApiError, DEFAULT_RETRY_CONFIG } from "@/lib/api";
import { StackMember } from "@/lib/types";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export const usePendingStackInvites = (enabled: boolean) => {
  const { getIdToken } = useFirebaseAuth();

  return useQuery<StackMember[]>({
    queryKey: queryKeys.stackPendingInvites,
    queryFn: async () => {
      try {
        return await apiFetchWithAuth<StackMember[]>(
          "/api/billing/stack/pending-invites",
          getIdToken,
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return [];
        }
        throw error;
      }
    },
    enabled,
    staleTime: 1000 * 30,
    ...DEFAULT_RETRY_CONFIG,
  });
};

export const usePendingStackInvite = usePendingStackInvites;
