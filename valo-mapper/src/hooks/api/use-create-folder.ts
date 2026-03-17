"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { Folder } from "@/lib/types";

interface CreateFolderParams {
  name: string;
  parentFolderId: number | null;
}

export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: ({ name, parentFolderId }: CreateFolderParams) =>
      apiFetchWithAuth<Folder>("/api/folders", getIdToken, {
        method: "POST",
        body: JSON.stringify({ name, parentFolderId }),
      }),
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
