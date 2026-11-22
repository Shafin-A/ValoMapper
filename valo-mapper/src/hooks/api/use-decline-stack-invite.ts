import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { useTranslations } from "next-intl";

export const useDeclineStackInvite = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  return useMutation({
    mutationFn: (inviteId: number) =>
      apiFetchWithAuth<null>(
        `/api/billing/stack/decline/${inviteId}`,
        getIdToken,
        {
          method: "POST",
        },
      ),
    onSuccess: () => {
      toast.success(t("inviteDeclined"));
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      queryClient.invalidateQueries({ queryKey: queryKeys.stackMembers });
      queryClient.invalidateQueries({ queryKey: queryKeys.stackPendingInvites });
    },
    onError: (error) => {
      toast.error(t("failed", { error: error.message }));
    },
  });
};
