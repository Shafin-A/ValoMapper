"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Strategy } from "@/lib/types";

interface DuplicateStrategyParams {
  strategyId: number;
}

export const useDuplicateStrategy = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  const { mutate, isPending, isError } = useMutation({
    mutationFn: ({ strategyId }: DuplicateStrategyParams) =>
      apiFetchWithAuth<Strategy>(
        `/api/strategies/${strategyId}/duplicate`,
        getIdToken,
        { method: "POST" },
      ),
    onSuccess: (data) => {
      toast.success(t("strategyDuplicated", { name: data.name }));
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
