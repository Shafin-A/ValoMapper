"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";

interface ResumeSubscriptionResponse {
  subscriptionId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
}

export const useResumeSubscription = () => {
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: () =>
      apiFetchWithAuth<ResumeSubscriptionResponse>(
        "/api/billing/resume-subscription",
        getIdToken,
        { method: "POST" },
      ),
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
