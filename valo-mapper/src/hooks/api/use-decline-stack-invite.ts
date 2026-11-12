import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";

export const useDeclineStackInvite = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

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
      toast.success("Stack invite declined");
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      queryClient.invalidateQueries({ queryKey: queryKeys.stackMembers });
      queryClient.invalidateQueries({ queryKey: queryKeys.stackPendingInvites });
    },
    onError: (error) => {
      toast.error(`Failed to decline stack invite: ${error.message}`);
    },
  });
};
