import { ShieldCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type CheckoutPlan, type CheckoutPlanOption } from "@/lib/consts";

interface CheckoutPlanSelectorProps {
  resolvedPlanOptions: CheckoutPlanOption[];
  selectedPlan: CheckoutPlan;
  selectedPlanOption: CheckoutPlanOption;
  onPlanChange: (plan: CheckoutPlan) => void;
  trialHeadline: string;
  trialDescription: string;
}

export const CheckoutPlanSelector = ({
  resolvedPlanOptions,
  selectedPlan,
  selectedPlanOption,
  onPlanChange,
  trialHeadline,
  trialDescription,
}: CheckoutPlanSelectorProps) => {
  return (
    <>
      <div className="space-y-2">
        <div className="text-sm font-medium">Selected plan</div>
        <Select
          value={selectedPlan}
          onValueChange={(value) => onPlanChange(value as CheckoutPlan)}
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
        <p className="mt-1 text-base font-semibold">
          {selectedPlanOption.priceLabel}
        </p>
        <p className="text-muted-foreground">{selectedPlanOption.cadence}</p>
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
    </>
  );
};
