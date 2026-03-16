import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError, DEFAULT_RETRY_CONFIG } from "@/lib/api";
import { StackMember } from "@/lib/types";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export const usePendingStackInvite = (enabled: boolean) => {
  const { getIdToken } = useFirebaseAuth();

  return useQuery<StackMember | null>({
    queryKey: ["stack-pending-invite"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      try {
        return await apiFetch<StackMember>(
          "/api/billing/stack/pending-invite",
          {
            token,
          },
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled,
    staleTime: 1000 * 30,
    ...DEFAULT_RETRY_CONFIG,
  });
};
