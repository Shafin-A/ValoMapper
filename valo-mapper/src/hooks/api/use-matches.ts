import { apiFetchWithAuth, authQueryOptions } from "@/lib/api";
import { MatchPreviewsResponse } from "@/lib/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useFirebaseAuth } from "../use-firebase-auth";

export const useMatches = (enabled = true, limit = 10) => {
  const {
    getIdToken,
    user: firebaseUser,
    loading: authLoading,
  } = useFirebaseAuth();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteQuery<MatchPreviewsResponse>({
    queryKey: ["matches", limit],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      apiFetchWithAuth<MatchPreviewsResponse>(
        `/api/matches?start=${encodeURIComponent(String(pageParam))}&limit=${encodeURIComponent(String(limit))}`,
        getIdToken,
      ),
    getNextPageParam: (lastPage) => lastPage.pagination.nextStart ?? undefined,
    enabled: enabled && !!firebaseUser && !authLoading,
    ...authQueryOptions,
  });

  const pages = data?.pages ?? [];
  const matches = pages.flatMap((page) => page.matches);
  const pagination = pages.at(-1)?.pagination ?? {
    start: 0,
    limit,
    total: 0,
    hasMore: false,
    nextStart: null,
  };

  return {
    data,
    matches,
    pagination,
    isLoading: authLoading || isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    isFetchNextPageError,
  };
};
