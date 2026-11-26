"use client";

import { useQuery } from "@tanstack/react-query";

import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth, authQueryOptions } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

type StrategyTagsResponse = {
  tags: string[];
};

export const useStrategyTags = (enabled = true) => {
  const {
    getIdToken,
    user: firebaseUser,
    loading: authLoading,
  } = useFirebaseAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.strategyTags,
    queryFn: () =>
      apiFetchWithAuth<StrategyTagsResponse>(
        "/api/strategies/tags",
        getIdToken,
      ),
    enabled: enabled && !!firebaseUser && !authLoading,
    ...authQueryOptions,
  });

  return {
    tags: data?.tags ?? [],
    isLoading: authLoading || isLoading,
    isError,
    error,
    refetch,
  };
};
