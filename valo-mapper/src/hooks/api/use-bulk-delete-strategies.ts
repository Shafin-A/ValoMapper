"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

type BulkDeleteStrategiesResponse = {
  deleted: number;
};

export const useBulkDeleteStrategies = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  const { mutate, isPending, isError } = useMutation({
    mutationFn: (ids: number[]) =>
      apiFetchWithAuth<BulkDeleteStrategiesResponse>(
        "/api/strategies/bulk-delete",
        getIdToken,
        {
          method: "POST",
          body: JSON.stringify({ ids }),
        },
      ),
    onSuccess: (data) => {
      toast.success(t("strategiesDeleted", { count: data.deleted }));
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
