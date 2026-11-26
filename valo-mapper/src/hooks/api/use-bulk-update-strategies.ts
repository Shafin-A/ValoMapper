"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type BulkUpdateStrategiesParams = {
  ids: number[];
  folderId?: number | null;
  hasFolderId?: boolean;
  isFavorite?: boolean;
  addTags?: string[];
  removeTags?: string[];
};

type BulkUpdateStrategiesResponse = {
  updated: number;
};

export const useBulkUpdateStrategies = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  const { mutate, isPending, isError } = useMutation({
    mutationFn: ({
      ids,
      folderId,
      hasFolderId = false,
      isFavorite,
      addTags,
      removeTags,
    }: BulkUpdateStrategiesParams) => {
      const payload: {
        ids: number[];
        folderId?: number | null;
        isFavorite?: boolean;
        addTags?: string[];
        removeTags?: string[];
      } = { ids };

      if (hasFolderId) {
        payload.folderId = folderId ?? null;
      }
      if (typeof isFavorite === "boolean") {
        payload.isFavorite = isFavorite;
      }
      if (addTags?.length) {
        payload.addTags = addTags;
      }
      if (removeTags?.length) {
        payload.removeTags = removeTags;
      }

      return apiFetchWithAuth<BulkUpdateStrategiesResponse>(
        "/api/strategies/bulk",
        getIdToken,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: (data) => {
      toast.success(t("strategiesUpdated", { count: data.updated }));
      queryClient.invalidateQueries({ queryKey: queryKeys.folders });
      queryClient.invalidateQueries({
        queryKey: queryKeys.strategyLibraryRoot,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.strategyTags });
    },
    onError: (error) => {
      toast.error(t("failed", { error: error.message }));
    },
  });

  return { mutate, isPending, isError };
};
