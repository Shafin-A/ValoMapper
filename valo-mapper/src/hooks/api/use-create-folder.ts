"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";
import { Folder } from "@/lib/types";

interface CreateFolderParams {
  name: string;
  parentFolderId: number | null;
}

export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: async ({ name, parentFolderId }: CreateFolderParams) => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      return apiFetch<Folder>("/api/folders", {
        method: "POST",
        token,
        body: JSON.stringify({ name, parentFolderId }),
      });
    },
    onSuccess: (data) => {
      toast.success(`Folder "${data.name}" created successfully!`);
      queryClient.invalidateQueries({
        queryKey: ["folders-and-strategies"],
      });
    },
    onError: (error) => {
      toast.error(`Failed to create folder: ${error.message}`);
    },
  });
};
