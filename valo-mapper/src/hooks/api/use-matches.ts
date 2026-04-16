import { apiFetchWithAuth, authQueryOptions } from "@/lib/api";
import { MatchPreviewsResponse } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useFirebaseAuth } from "../use-firebase-auth";

export const useMatches = (enabled = true, limit = 10) => {
  const {
    getIdToken,
    user: firebaseUser,
    loading: authLoading,
  } = useFirebaseAuth();

  const { data, isLoading, isError, error, refetch } =
    useQuery<MatchPreviewsResponse>({
      queryKey: ["matches", limit],
      queryFn: () =>
        apiFetchWithAuth<MatchPreviewsResponse>(
          `/api/matches?limit=${encodeURIComponent(String(limit))}`,
          getIdToken,
        ),
      enabled: enabled && !!firebaseUser && !authLoading,
      ...authQueryOptions,
    });

  return {
    data,
    isLoading: authLoading || isLoading,
    isError,
    error,
    refetch,
  };
};
