import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";

export const useDeclineStackInvite = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: async (inviteId: number) => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      return apiFetch<null>(`/api/billing/stack/decline/${inviteId}`, {
        method: "POST",
        token,
      });
    },
    onSuccess: () => {
      toast.success("Stack invite declined");
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["stack-members"] });
      queryClient.invalidateQueries({ queryKey: ["stack-pending-invites"] });
    },
    onError: (error) => {
      toast.error(`Failed to decline stack invite: ${error.message}`);
    },
  });
};
