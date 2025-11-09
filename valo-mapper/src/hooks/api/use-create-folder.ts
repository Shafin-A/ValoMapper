"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

interface CreateFolderParams {
  name: string;
  parentFolderId: number | null;
}

export const useCreateFolder = () => {
  const { getIdToken } = useFirebaseAuth();
  return useMutation({
    mutationFn: async ({ name, parentFolderId }: CreateFolderParams) => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      const response = await fetch("http://localhost:8080/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, parentFolderId }),
      });

      if (!response.ok) throw new Error("Failed to create folder");

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Folder "${data.folderName}" created successfully!`);
    },
    onError: (error) => {
      toast.error(`Failed to create folder. Error: ${error.message}`);
    },
  });
};
