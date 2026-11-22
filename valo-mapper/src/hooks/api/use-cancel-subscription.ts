"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { useTranslations } from "next-intl";

interface CancelSubscriptionResponse {
  subscriptionId: string;
  status: string;
}

export const useCancelSubscription = () => {
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  return useMutation({
    mutationFn: () =>
      apiFetchWithAuth<CancelSubscriptionResponse>(
        "/api/billing/cancel-subscription",
        getIdToken,
        { method: "POST" },
      ),
    onSuccess: () => {
      toast.success(t("subscriptionCanceled"));
    },
    onError: (error) => {
      toast.error(t("failed", { error: error.message }));
    },
  });
};
