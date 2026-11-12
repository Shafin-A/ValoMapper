import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";

export const useLeaveStack = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: () =>
      apiFetchWithAuth<null>("/api/billing/stack/leave", getIdToken, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Left stack");
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
      queryClient.invalidateQueries({ queryKey: queryKeys.stackMembers });
      queryClient.invalidateQueries({ queryKey: queryKeys.stackPendingInvites });
    },
    onError: (error) => {
      toast.error(`Failed to leave stack: ${error.message}`);
    },
  });
};
