"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";

interface ResumeSubscriptionResponse {
  subscriptionId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
}

export const useResumeSubscription = () => {
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      return apiFetch<ResumeSubscriptionResponse>(
        "/api/billing/resume-subscription",
        {
          method: "POST",
          token,
        },
      );
    },
    onSuccess: () => {
      toast.success(
        "Cancellation removed. Your subscription will renew normally.",
      );
    },
    onError: (error) => {
      toast.error(`Failed to resume subscription: ${error.message}`);
    },
  });
};
