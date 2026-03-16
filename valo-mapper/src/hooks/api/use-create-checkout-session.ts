"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";
import { type CheckoutPlan } from "@/lib/consts";

interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

interface CreateCheckoutSessionRequest {
  returnTo?: string;
  plan?: CheckoutPlan;
  startWithTrial?: boolean;
}

export const useCreateCheckoutSession = () => {
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: async (request: CreateCheckoutSessionRequest = {}) => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      const payload: CreateCheckoutSessionRequest = {};
      if (request.returnTo) {
        payload.returnTo = request.returnTo;
      }
      if (request.plan) {
        payload.plan = request.plan;
      }
      if (request.startWithTrial) {
        payload.startWithTrial = true;
      }

      const body =
        Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined;

      return apiFetch<CheckoutSessionResponse>(
        "/api/billing/checkout-session",
        {
          method: "POST",
          token,
          ...(body ? { body } : {}),
        },
      );
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(`Failed to start checkout: ${error.message}`);
    },
  });
};
