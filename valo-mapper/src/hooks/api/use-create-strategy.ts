"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

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

      const response = await fetch("/api/strategies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, lobbyCode, folderId }),
      });

      if (!response.ok) throw new Error("Failed to create strategy");

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Strategy "${data.name}" created successfully!`);
      queryClient.invalidateQueries({
        queryKey: ["folders-and-strategies"],
      });
    },
    onError: (error) => {
      toast.error(`Failed to create strategy. Error: ${error.message}`);
    },
  });
};
