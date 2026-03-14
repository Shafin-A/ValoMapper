"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";

interface CancelSubscriptionResponse {
  subscriptionId: string;
  status: string;
}

export const useCancelSubscription = () => {
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      return apiFetch<CancelSubscriptionResponse>(
        "/api/billing/cancel-subscription",
        {
          method: "POST",
          token,
        },
      );
    },
    onSuccess: () => {
      toast.success(
        "Subscription will cancel at the end of your billing period",
      );
    },
    onError: (error) => {
      toast.error(`Failed to cancel subscription: ${error.message}`);
    },
  });
};
