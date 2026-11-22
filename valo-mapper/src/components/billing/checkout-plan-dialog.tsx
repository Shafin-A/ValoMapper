"use client";

import { useMemo, useState, type ReactElement } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateCheckoutSession } from "@/hooks/api/use-create-checkout-session";
import {
  CHECKOUT_PLAN_OPTIONS,
  DEFAULT_CHECKOUT_PLAN,
  PREMIUM_TRIAL_DAYS,
  type CheckoutPlanOption,
  type CheckoutPlan,
} from "@/lib/consts";
import { useBillingPlans } from "@/hooks/api/use-billing-plans";
import { useUser } from "@/hooks/api/use-user";
import { PlanComparisonTable } from "./plan-comparison-table";
import { CheckoutPlanSelector } from "./checkout-plan-selector";
import { useTranslations } from "next-intl";

interface CheckoutPlanDialogProps {
  returnToPath: string;
  trigger: ReactElement;
}

export const CheckoutPlanDialog = ({
  returnToPath,
  trigger,
}: CheckoutPlanDialogProps) => {
  const t = useTranslations("billing");
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlan>(
    DEFAULT_CHECKOUT_PLAN,
  );
  const [checkoutIntent, setCheckoutIntent] = useState<"trial" | "paid" | null>(
    null,
  );

  const { mutate: createCheckoutSession, isPending } =
    useCreateCheckoutSession();
  const { data: billingPlans } = useBillingPlans();
  const { data: userProfile } = useUser();
  const premiumTrialDays = Math.max(0, PREMIUM_TRIAL_DAYS);

  const isMonthlyPlan = selectedPlan === "monthly";
  const isStackPlan = selectedPlan === "stack";
  const trialEligible = userProfile?.premiumTrialEligible === true;
  const isMonthlyTrialOffer = isMonthlyPlan && premiumTrialDays > 0;
  const showTrialButton = isMonthlyTrialOffer && trialEligible;

  const trialHeadline = showTrialButton
    ? t("trialHeadline", { days: premiumTrialDays })
    : isMonthlyPlan
      ? t("monthlyStarts")
      : isStackPlan
        ? t("stackStarts")
        : t("yearlyStarts");

  const trialDescription = showTrialButton
    ? t("trialDescription")
    : isMonthlyPlan
      ? t("monthlyDescription")
      : isStackPlan
        ? t("stackDescription")
        : t("yearlyDescription");

  const resolvedPlanOptions = useMemo<CheckoutPlanOption[]>(() => {
    const formatPriceLabel = (
      unitAmount: number,
      currency: string,
      interval: string,
      intervalCount: number,
    ) => {
      const amount = unitAmount / 100;
      const formattedAmount = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amount);

      if (intervalCount > 1) {
        return `${formattedAmount}/${intervalCount} ${interval}s`;
      }

      return `${formattedAmount}/${interval}`;
    };

    const planMap = {
      monthly: billingPlans?.monthly,
      yearly: billingPlans?.yearly,
      stack: billingPlans?.stack,
    };

    return CHECKOUT_PLAN_OPTIONS.map((option) => {
      const livePlan = planMap[option.id];
      if (!livePlan) {
        return option;
      }

      return {
        ...option,
        priceLabel: formatPriceLabel(
          livePlan.unitAmount,
          livePlan.currency,
          livePlan.interval,
          livePlan.intervalCount,
        ),
        currencyCode: livePlan.currency.toUpperCase(),
      };
    });
  }, [billingPlans]);

  const selectedPlanOption = useMemo(() => {
    return (
      resolvedPlanOptions.find((option) => option.id === selectedPlan) ??
      resolvedPlanOptions[0]
    );
  }, [selectedPlan, resolvedPlanOptions]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setSelectedPlan(DEFAULT_CHECKOUT_PLAN);
      setCheckoutIntent(null);
    }
  };

  const handleContinue = (withTrial: boolean) => {
    setCheckoutIntent(withTrial ? "trial" : "paid");
    createCheckoutSession(
      {
        returnTo: returnToPath,
        plan: selectedPlan,
        startWithTrial: showTrialButton && withTrial,
      },
      {
        onSettled: () => {
          setCheckoutIntent(null);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[95vw] max-h-[calc(100dvh-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-3 sm:max-w-4xl sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto pr-1">
          <div className="space-y-4 pb-1">
            <PlanComparisonTable
              resolvedPlanOptions={resolvedPlanOptions}
              billingPlans={billingPlans}
              selectedPlan={selectedPlan}
            />
            <CheckoutPlanSelector
              resolvedPlanOptions={resolvedPlanOptions}
              selectedPlan={selectedPlan}
              selectedPlanOption={selectedPlanOption}
              onPlanChange={setSelectedPlan}
              trialHeadline={trialHeadline}
              trialDescription={trialDescription}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 border-t bg-background pt-3 sm:flex-row sm:justify-end sm:pt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {t("back")}
          </Button>
          {showTrialButton && (
            <Button
              variant="outline"
              onClick={() => handleContinue(true)}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending && checkoutIntent === "trial" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("tryFree")}
            </Button>
          )}
          <Button
            onClick={() => handleContinue(false)}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending && checkoutIntent === "paid" && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {showTrialButton ? t("subscribeNow") : t("continueCheckout")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
