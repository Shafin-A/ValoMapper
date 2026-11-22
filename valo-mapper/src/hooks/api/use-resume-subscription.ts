"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetchWithAuth } from "@/lib/api";
import { useTranslations } from "next-intl";

interface ResumeSubscriptionResponse {
  subscriptionId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
}

export const useResumeSubscription = () => {
  const { getIdToken } = useFirebaseAuth();
  const t = useTranslations("toasts");

  return useMutation({
    mutationFn: () =>
      apiFetchWithAuth<ResumeSubscriptionResponse>(
        "/api/billing/resume-subscription",
        getIdToken,
        { method: "POST" },
      ),
    onSuccess: () => {
      toast.success(t("subscriptionResumed"));
    },
    onError: (error) => {
      toast.error(t("failed", { error: error.message }));
    },
  });
};
