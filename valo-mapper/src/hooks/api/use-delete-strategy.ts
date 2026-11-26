import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { useTranslations } from "next-intl";

interface DeleteStrategyParams {
  strategyId: number;
}

export const useDeleteStrategy = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  const { mutate, isPending, isError } = useMutation({
    mutationFn: ({ strategyId }: DeleteStrategyParams) =>
      apiFetchWithAuth<null>(`/api/strategies/${strategyId}`, getIdToken, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success(t("strategyDeleted"));
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

  return {
    mutate,
    isPending,
    isError,
  };
};
