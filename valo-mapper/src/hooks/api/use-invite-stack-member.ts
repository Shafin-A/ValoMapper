import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { StackMember } from "@/lib/types";

interface InviteStackMemberRequest {
  firebaseUid: string;
}

export const useInviteStackMember = () => {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();

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
      toast.success("Stack invite sent");
      queryClient.invalidateQueries({ queryKey: ["stack-members"] });
    },
    onError: (error) => {
      toast.error(`Failed to invite stack member: ${error.message}`);
    },
  });
};
