import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { useTranslations } from "next-intl";

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  const { mutate, isPending, isError } = useMutation({
    mutationFn: () =>
      apiFetchWithAuth<null>("/api/users/me", getIdToken, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      toast.success(t("userDeleted"));
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
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
