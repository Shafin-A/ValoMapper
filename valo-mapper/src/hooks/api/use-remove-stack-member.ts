import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";

export const useRemoveStackMember = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: (stackMemberId: number) =>
      apiFetchWithAuth<null>(
        `/api/billing/stack/members/${stackMemberId}`,
        getIdToken,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      toast.success("Stack member removed");
      queryClient.invalidateQueries({ queryKey: ["stack-members"] });
    },
    onError: (error) => {
      toast.error(`Failed to remove stack member: ${error.message}`);
    },
  });
};
