import { queryKeys } from "@/lib/query-keys";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { useTranslations } from "next-intl";
import { Strategy } from "@/lib/types";

interface UpdateStrategyParams {
  strategyId: number;
  name?: string;
  folderId?: number | null;
  includeFolderId?: boolean;
  tags?: string[];
  isFavorite?: boolean;
  silent?: boolean;
}

export const useUpdateStrategy = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  const { mutate, isPending, isError } = useMutation({
    mutationFn: ({
      strategyId,
      name,
      folderId,
      includeFolderId = false,
      tags,
      isFavorite,
    }: UpdateStrategyParams) => {
      const payload: {
        name?: string;
        folderId?: number | null;
        tags?: string[];
        isFavorite?: boolean;
      } = {};

      if (typeof name === "string") {
        payload.name = name;
      }

      if (includeFolderId) {
        payload.folderId = folderId ?? null;
      }

      if (Array.isArray(tags)) {
        payload.tags = tags;
      }

      if (typeof isFavorite === "boolean") {
        payload.isFavorite = isFavorite;
      }

      return apiFetchWithAuth<Strategy>(
        `/api/strategies/${strategyId}`,
        getIdToken,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: (data, variables) => {
      if (!variables.silent) {
        toast.success(t("strategyUpdated", { name: data.name }));
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.folders });
      queryClient.invalidateQueries({
        queryKey: queryKeys.strategyLibraryRoot,
      });
      if (Array.isArray(variables.tags)) {
        queryClient.invalidateQueries({ queryKey: queryKeys.strategyTags });
      }
    },
    onError: (error) => {
      toast.error(t("failed", { error: error.message }));
    },
  });

  return {
    mutate,
    isPending,
    isError,
  };
};
