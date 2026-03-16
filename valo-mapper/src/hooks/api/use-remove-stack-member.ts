import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";

export const useRemoveStackMember = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: async (stackMemberId: number) => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      return apiFetch<null>(`/api/billing/stack/members/${stackMemberId}`, {
        method: "DELETE",
        token,
      });
    },
    onSuccess: () => {
      toast.success("Stack member removed");
      queryClient.invalidateQueries({ queryKey: ["stack-members"] });
    },
    onError: (error) => {
      toast.error(`Failed to remove stack member: ${error.message}`);
    },
  });
};
