import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";
import { StackMember } from "@/lib/types";

interface InviteStackMemberRequest {
  firebaseUid: string;
}

export const useInviteStackMember = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: async (firebaseUid: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      const payload: InviteStackMemberRequest = {
        firebaseUid: firebaseUid.trim(),
      };

      return apiFetch<StackMember>("/api/billing/stack/invite", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success("Stack invite sent");
      queryClient.invalidateQueries({ queryKey: ["stack-members"] });
    },
    onError: (error) => {
      toast.error(`Failed to invite stack member: ${error.message}`);
    },
  });
};
