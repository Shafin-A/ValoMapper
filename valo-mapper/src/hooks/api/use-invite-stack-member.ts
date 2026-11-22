import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { useTranslations } from "next-intl";
import { StackMember } from "@/lib/types";

interface InviteStackMemberRequest {
  firebaseUid: string;
}

export const useInviteStackMember = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  return useMutation({
    mutationFn: (firebaseUid: string) => {
      const payload: InviteStackMemberRequest = {
        firebaseUid: firebaseUid.trim(),
      };

      return apiFetchWithAuth<StackMember>(
        "/api/billing/stack/invite",
        getIdToken,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: () => {
      toast.success(t("inviteSent"));
      queryClient.invalidateQueries({ queryKey: queryKeys.stackMembers });
    },
    onError: (error) => {
      toast.error(t("failed", { error: error.message }));
    },
  });
};
