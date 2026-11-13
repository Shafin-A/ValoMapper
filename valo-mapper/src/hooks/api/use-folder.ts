"use client";
import { queryKeys } from "@/lib/query-keys";

import { apiFetchWithAuth, authQueryOptions } from "@/lib/api";
import { Folder, Strategy } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { buildTree } from "@/lib/strategy-tree";

export const useFolders = () => {
  const {
    getIdToken,
    user: firebaseUser,
    loading: authLoading,
  } = useFirebaseAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.folders,
    queryFn: async () => {
      const [folders, strategies] = await Promise.all([
        apiFetchWithAuth<Folder[]>("/api/folders", getIdToken),
        apiFetchWithAuth<Strategy[]>("/api/strategies", getIdToken),
      ]);

      return buildTree(folders, strategies);
    },
    enabled: !!firebaseUser && !authLoading,
    ...authQueryOptions,
  });

  return { data, isLoading: authLoading || isLoading, isError, error, refetch };
};
