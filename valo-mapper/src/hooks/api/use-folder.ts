"use client";

import { Folder, Strategy } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export const useFolders = () => {
  const { getIdToken } = useFirebaseAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["folders-and-strategies"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const [foldersRes, strategiesRes] = await Promise.all([
        fetch("http://localhost:8080/api/folders", { method: "GET", headers }),
        fetch("http://localhost:8080/api/strategies", {
          method: "GET",
          headers,
        }),
      ]);

      if (!foldersRes.ok || !strategiesRes.ok) {
        throw new Error("Failed to fetch folders or strategies");
      }

      const folders = await foldersRes.json();
      const strategies = await strategiesRes.json();

      return {
        folders: folders as Folder[],
        strategies: strategies as Strategy[],
      };
    },
  });

  return { data, isLoading, isError, refetch };
};
