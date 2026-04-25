import {
  ALL_MATCH_QUEUE_FILTER,
  DEFAULT_MATCH_QUEUE_FILTER,
} from "@/lib/consts";
import { filterMatchesByQueue, isMatchQueueFilter } from "@/lib/matches";
import { MatchQueueFilter } from "@/lib/types";
import { useState } from "react";
import { useMatches } from "@/hooks/api/use-matches";
import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export const useMatchesPage = () => {
  const [expandedMatchIds, setExpandedMatchIds] = useState<string[]>([]);
  const [selectedRoundByMatch, setSelectedRoundByMatch] = useState<
    Record<string, number>
  >({});
  const [queueFilter, setQueueFilter] = useState<MatchQueueFilter>(
    DEFAULT_MATCH_QUEUE_FILTER,
  );

  const { user: firebaseUser, loading: authLoading } = useFirebaseAuth();
  const { data: userProfile, isLoading: isUserLoading } = useUser();

  const isRSOUser = Boolean(userProfile?.rsoSubjectId) && userProfile?.id === 5;
  const canLoadMatches = Boolean(firebaseUser && isRSOUser);

  const setExpandedMatches = (nextExpandedMatchIds: string[]) => {
    setExpandedMatchIds(nextExpandedMatchIds);
    setSelectedRoundByMatch((prev) => {
      let hasChanges = false;
      const next = { ...prev };

      for (const matchId of nextExpandedMatchIds) {
        if (next[matchId] == null) {
          next[matchId] = 1;
          hasChanges = true;
        }
      }

      return hasChanges ? next : prev;
    });
  };

  const selectRound = (matchId: string, roundNumber: number) => {
    setSelectedRoundByMatch((prev) => ({
      ...prev,
      [matchId]: roundNumber,
    }));
  };

  const {
    matches: loadedMatches,
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

  const matches = filterMatchesByQueue(loadedMatches, queueFilter);

  const selectQueueFilter = (value: string) => {
    if (!isMatchQueueFilter(value)) {
      return;
    }

    setQueueFilter(value);
    setExpandedMatchIds((currentExpandedMatchIds) => {
      if (value === ALL_MATCH_QUEUE_FILTER) {
        return currentExpandedMatchIds;
      }

      const visibleMatchIds = new Set(
        loadedMatches
          .filter((match) => match.queueLabel === value)
          .map((match) => match.matchId),
      );

      return currentExpandedMatchIds.filter((matchId) =>
        visibleMatchIds.has(matchId),
      );
    });
  };

  return {
    firebaseUser,
    isRSOUser,
    canLoadMatches,
    isPageLoading: authLoading || isUserLoading,
    matches,
    loadedMatchesCount: loadedMatches.length,
    totalMatches: pagination.total,
    isMatchesLoading,
    isMatchesError,
    matchesError,
    refetchMatches,
    queueFilter,
    selectQueueFilter,
    hasMoreMatches: hasNextPage,
    isFetchingNextMatches: isFetchingNextPage,
    isFetchNextMatchesError: isFetchNextPageError,
    fetchNextMatchesPage,
    expandedMatchIds,
    setExpandedMatches,
    selectedRoundByMatch,
    selectRound,
  };
};
