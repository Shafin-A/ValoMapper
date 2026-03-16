"use client";

import { useMemo, useState, type ReactElement } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface CheckoutPlanDialogProps {
  returnToPath: string;
  trigger: ReactElement;
}

export const CheckoutPlanDialog = ({
  returnToPath,
  trigger,
}: CheckoutPlanDialogProps) => {
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
  const premiumTrialDays = Math.max(
    0,
    billingPlans?.premiumTrialDays ?? PREMIUM_TRIAL_DAYS,
  );

  const isMonthlyPlan = selectedPlan === "monthly";
  const trialEligible = userProfile?.premiumTrialEligible === true;
  const isMonthlyTrialOffer = isMonthlyPlan && premiumTrialDays > 0;
  const showTrialButton = isMonthlyTrialOffer && trialEligible;

  const trialHeadline = showTrialButton
    ? `${premiumTrialDays}-day free trial available`
    : isMonthlyPlan
      ? "Monthly billing starts immediately"
      : "Yearly billing starts immediately";

  const trialDescription = showTrialButton
    ? "Choose Try out for free below to start with trial. After trial, billing continues on the monthly plan."
    : isMonthlyPlan
      ? "Your monthly billing starts immediately after checkout."
      : "Yearly billing begins at checkout and renews yearly until canceled.";

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review your upgrade</DialogTitle>
          <DialogDescription>
            Pick a plan, then continue to Stripe checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Plan</div>
            <Select
              value={selectedPlan}
              onValueChange={(value) => setSelectedPlan(value as CheckoutPlan)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {resolvedPlanOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label} ({option.priceLabel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{selectedPlanOption.label}</p>
            <p className="text-base font-semibold mt-1">
              {selectedPlanOption.priceLabel}
            </p>
            <p className="text-muted-foreground">
              {selectedPlanOption.cadence}
            </p>
            <p className="text-muted-foreground">
              Currency: {selectedPlanOption.currencyCode}
            </p>
            <p className="mt-2 text-muted-foreground">
              {selectedPlanOption.checkoutDescription}
            </p>
          </div>

          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
            <p className="font-medium">{trialHeadline}</p>
            <p className="mt-1 text-xs opacity-90">{trialDescription}</p>
          </div>

          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200">
            <p className="inline-flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4" />
              Secure checkout
            </p>
            <p className="mt-1 text-xs opacity-90">
              Payment is processed on Stripe. You can manage billing from your
              profile.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Back
          </Button>
          {showTrialButton && (
            <Button
              variant="outline"
              onClick={() => handleContinue(true)}
              disabled={isPending}
            >
              {isPending && checkoutIntent === "trial" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Try out for free
            </Button>
          )}
          <Button onClick={() => handleContinue(false)} disabled={isPending}>
            {isPending && checkoutIntent === "paid" && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {showTrialButton ? "Subscribe now" : "Continue to secure checkout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
