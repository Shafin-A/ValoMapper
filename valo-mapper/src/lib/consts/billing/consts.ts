export type CheckoutPlan = "monthly" | "yearly" | "stack";

export const PREMIUM_TRIAL_DAYS = 14;

export interface CheckoutPlanOption {
  id: CheckoutPlan;
  label: string;
  cadence: string;
  priceLabel: string;
  currencyCode: string;
  checkoutDescription: string;
}

export const DEFAULT_CHECKOUT_PLAN: CheckoutPlan = "monthly";

export const CHECKOUT_PLAN_OPTIONS: CheckoutPlanOption[] = [
  {
    id: "monthly",
    label: "ValoMapper Premium Monthly",
    cadence: "Billed every month",
    priceLabel: "$4.99/month",
    currencyCode: "USD",
    checkoutDescription:
      "Flexible monthly billing. Cancel anytime from your profile.",
  },
  {
    id: "yearly",
    label: "ValoMapper Premium Yearly",
    cadence: "Billed once per year",
    priceLabel: "$44.99/year",
    currencyCode: "USD",
    checkoutDescription:
      "Lower effective monthly cost with one annual payment and auto-renewal. Cancel anytime from your profile.",
  },
  {
    id: "stack",
    label: "ValoMapper Premium Stack",
    cadence: "Billed once per year",
    priceLabel: "$124.99/year",
    currencyCode: "USD",
    checkoutDescription:
      "Perfect for 5 stacks + 1 extra member that want to share their plan. Cancel anytime from your profile.",
  },
];
