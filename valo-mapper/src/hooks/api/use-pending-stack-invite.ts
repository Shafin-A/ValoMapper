import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError, DEFAULT_RETRY_CONFIG } from "@/lib/api";
import { StackMember } from "@/lib/types";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export const usePendingStackInvites = (enabled: boolean) => {
  const { getIdToken } = useFirebaseAuth();

  return useQuery<StackMember[]>({
    queryKey: ["stack-pending-invites"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      try {
        return await apiFetch<StackMember[]>(
          "/api/billing/stack/pending-invites",
          {
            token,
          },
        );
      } catch (error) {
        // Backward compatibility for clients during rollout.
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
