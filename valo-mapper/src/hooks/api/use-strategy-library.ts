"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";

import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth, authQueryOptions } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Strategy } from "@/lib/types";
import {
  buildStrategyLibrarySearchParams,
  STRATEGY_LIBRARY_PAGE_SIZE,
  type StrategyLibraryFilters,
} from "@/lib/strategy-library";

export type StrategyLibraryResponse = {
  items: Strategy[];
  total: number;
  limit: number;
  offset: number;
};

export const useStrategyLibrary = (
  filters: StrategyLibraryFilters,
  enabled = true,
) => {
  const {
    getIdToken,
    user: firebaseUser,
    loading: authLoading,
  } = useFirebaseAuth();

  const queryString = buildStrategyLibrarySearchParams(filters);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery<StrategyLibraryResponse>({
    queryKey: queryKeys.strategyLibrary(queryString),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      apiFetchWithAuth<StrategyLibraryResponse>(
        `/api/strategies/library?${buildStrategyLibrarySearchParams(
          filters,
          Number(pageParam) || 0,
          STRATEGY_LIBRARY_PAGE_SIZE,
        )}`,
        getIdToken,
      ),
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    placeholderData: keepPreviousData,
    enabled: enabled && !!firebaseUser && !authLoading,
    ...authQueryOptions,
  });

  const pages = data?.pages ?? [];
  const items = pages.flatMap((page) => page.items ?? []);
  const total = pages[0]?.total ?? 0;

  return {
    items,
    total,
    isLoading: authLoading || isLoading,
    isFetching,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
  };
};
