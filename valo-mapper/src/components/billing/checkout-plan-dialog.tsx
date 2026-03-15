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
  type CheckoutPlanOption,
  type CheckoutPlan,
} from "@/lib/consts";
import { useBillingPlans } from "@/hooks/api/use-billing-plans";

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

  const { mutate: createCheckoutSession, isPending } =
    useCreateCheckoutSession();
  const { data: billingPlans } = useBillingPlans();

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
    }
  };

  const handleContinue = () => {
    createCheckoutSession({
      returnTo: returnToPath,
      plan: selectedPlan,
    });
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
          <Button onClick={handleContinue} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue to secure checkout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
