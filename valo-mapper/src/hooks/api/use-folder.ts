"use client";

import { apiFetch, authQueryOptions } from "@/lib/api";
import { Folder, Strategy } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { buildTree } from "@/lib/utils";

export const useFolders = () => {
  const { getIdToken } = useFirebaseAuth();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["folders-and-strategies"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      const [folders, strategies] = await Promise.all([
        apiFetch<Folder[]>("/api/folders", { token }),
        apiFetch<Strategy[]>("/api/strategies", { token }),
      ]);

      return buildTree(folders, strategies);
    },
    ...authQueryOptions,
  });

  return { data, isLoading, isError, error, refetch };
};
