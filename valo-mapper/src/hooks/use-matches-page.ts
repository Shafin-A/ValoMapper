import { useState } from "react";
import { useMatchSummary } from "@/hooks/api/use-match-summary";
import { useMatches } from "@/hooks/api/use-matches";
import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export const useMatchesPage = () => {
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [selectedRoundByMatch, setSelectedRoundByMatch] = useState<
    Record<string, number>
  >({});

  const { user: firebaseUser, loading: authLoading } = useFirebaseAuth();
  const { data: userProfile, isLoading: isUserLoading } = useUser();

  const isRSOUser = Boolean(userProfile?.rsoSubjectId) && userProfile?.id === 5;
  const canLoadMatches = Boolean(firebaseUser && isRSOUser);

  const toggleExpanded = (matchId: string) => {
    setExpandedMatchId((current) => {
      const next = current === matchId ? null : matchId;
      if (next) {
        setSelectedRoundByMatch((prev) => ({
          ...prev,
          [next]: prev[next] ?? 1,
        }));
      }
      return next;
    });
  };

  const selectRound = (matchId: string, roundNumber: number) => {
    setSelectedRoundByMatch((prev) => ({
      ...prev,
      [matchId]: roundNumber,
    }));
  };

  const {
    matches,
    pagination,
    isLoading: isMatchesLoading,
    isError: isMatchesError,
    error: matchesError,
    refetch: refetchMatches,
    fetchNextPage: fetchNextMatchesPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useMatches(canLoadMatches, 10);

  const {
    data: expandedMatchSummary,
    isLoading: isMatchSummaryLoading,
    isError: isMatchSummaryError,
    error: matchSummaryError,
    refetch: refetchMatchSummary,
  } = useMatchSummary(expandedMatchId, canLoadMatches && !!expandedMatchId);

  return {
    firebaseUser,
    isRSOUser,
    canLoadMatches,
    isPageLoading: authLoading || isUserLoading,
    matches,
    totalMatches: pagination.total,
    isMatchesLoading,
    isMatchesError,
    matchesError,
    refetchMatches,
    hasMoreMatches: hasNextPage,
    isFetchingNextMatches: isFetchingNextPage,
    isFetchNextMatchesError: isFetchNextPageError,
    fetchNextMatchesPage,
    expandedMatchId,
    expandedMatchSummary,
    isMatchSummaryLoading,
    isMatchSummaryError,
    matchSummaryError,
    refetchMatchSummary,
    selectedRoundByMatch,
    toggleExpanded,
    selectRound,
  };
};
