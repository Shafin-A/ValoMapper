"use client";
import { queryKeys } from "@/lib/query-keys";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { useTranslations } from "next-intl";
import { Folder } from "@/lib/types";

interface CreateFolderParams {
  name: string;
  parentFolderId: number | null;
}

export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  return useMutation({
    mutationFn: ({ name, parentFolderId }: CreateFolderParams) =>
      apiFetchWithAuth<Folder>("/api/folders", getIdToken, {
        method: "POST",
        body: JSON.stringify({ name, parentFolderId }),
      }),
    onSuccess: (data) => {
      toast.success(t("folderCreated", { name: data.name }));
      queryClient.invalidateQueries({
        queryKey: queryKeys.folders,
      });
    },
    onError: (error) => {
      toast.error(t("failed", { error: error.message }));
    },
  });
};
