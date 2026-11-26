"use client";
import { queryKeys } from "@/lib/query-keys";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { useTranslations } from "next-intl";
import { Strategy } from "@/lib/types";

interface CreateStrategyParams {
  name: string;
  lobbyCode: string;
  folderId?: number;
}

export const useCreateStrategy = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  return useMutation({
    mutationFn: ({ name, lobbyCode, folderId }: CreateStrategyParams) =>
      apiFetchWithAuth<Strategy>("/api/strategies", getIdToken, {
        method: "POST",
        body: JSON.stringify({ name, lobbyCode, folderId }),
      }),
    onSuccess: (data) => {
      toast.success(t("strategyCreated", { name: data.name }));
      queryClient.invalidateQueries({
        queryKey: queryKeys.folders,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.strategyLibraryRoot,
      });
    },
    onError: (error) => {
      toast.error(t("failed", { error: error.message }));
    },
  });
};
