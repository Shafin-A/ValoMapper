import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";

export const useAcceptStackInvite = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: (inviteId: number) =>
      apiFetchWithAuth<null>(
        `/api/billing/stack/accept/${inviteId}`,
        getIdToken,
        {
          method: "POST",
        },
      ),
    onSuccess: () => {
      toast.success("Stack invite accepted");
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["stack-members"] });
      queryClient.invalidateQueries({ queryKey: ["stack-pending-invites"] });
    },
    onError: (error) => {
      toast.error(`Failed to accept stack invite: ${error.message}`);
    },
  });
};
