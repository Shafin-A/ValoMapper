"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";
import { Strategy } from "@/lib/types";

interface CreateStrategyParams {
  name: string;
  lobbyCode: string;
  folderId?: number;
}

export const useCreateStrategy = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: async ({ name, lobbyCode, folderId }: CreateStrategyParams) => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      return apiFetch<Strategy>("/api/strategies", {
        method: "POST",
        token,
        body: JSON.stringify({ name, lobbyCode, folderId }),
      });
    },
    onSuccess: (data) => {
      toast.success(`Strategy "${data.name}" created successfully!`);
      queryClient.invalidateQueries({
        queryKey: ["folders-and-strategies"],
      });
    },
    onError: (error) => {
      toast.error(`Failed to create strategy: ${error.message}`);
    },
  });
};
