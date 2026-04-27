import { apiFetchWithAuth, authQueryOptions } from "@/lib/api";
import { MatchSummaryResponse } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useFirebaseAuth } from "../use-firebase-auth";

export const useMatchSummary = (
  matchId: string | null,
  enabled = true,
  includeReplayTelemetry = false,
) => {
  const {
    getIdToken,
    user: firebaseUser,
    loading: authLoading,
  } = useFirebaseAuth();

  const { data, isLoading, isError, error, refetch } =
    useQuery<MatchSummaryResponse>({
      queryKey: ["match-summary", matchId, includeReplayTelemetry],
      queryFn: () =>
        apiFetchWithAuth<MatchSummaryResponse>(
          `/api/matches/${encodeURIComponent(matchId ?? "")}/summary${includeReplayTelemetry ? "?includeReplayTelemetry=true" : ""}`,
          getIdToken,
        ),
      enabled: enabled && !!matchId && !!firebaseUser && !authLoading,
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
