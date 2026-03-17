import { useQuery } from "@tanstack/react-query";
import { apiFetch, DEFAULT_RETRY_CONFIG } from "@/lib/api";

export interface BillingPlanPrice {
  plan: "monthly" | "yearly" | "stack";
  priceId: string;
  currency: string;
  unitAmount: number;
  unitAmountDecimal: string;
  interval: string;
  intervalCount: number;
}

export interface BillingPlansResponse {
  monthly: BillingPlanPrice;
  yearly: BillingPlanPrice;
  stack: BillingPlanPrice;
}

export const useBillingPlans = () => {
  return useQuery<BillingPlansResponse>({
    queryKey: ["billing-plans"],
    queryFn: () => apiFetch<BillingPlansResponse>("/api/billing/plans"),
    staleTime: 1000 * 60 * 10,
    ...DEFAULT_RETRY_CONFIG,
  });
};
