"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { apiFetch } from "@/lib/api";

interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export const useCreateCheckoutSession = () => {
  const { getIdToken } = useFirebaseAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("User not authenticated");

      return apiFetch<CheckoutSessionResponse>(
        "/api/billing/checkout-session",
        { method: "POST", token },
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
