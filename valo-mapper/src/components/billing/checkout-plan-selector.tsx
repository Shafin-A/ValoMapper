import { ShieldCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type CheckoutPlan, type CheckoutPlanOption } from "@/lib/consts";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("billing");
  const planName = (plan: CheckoutPlan) =>
    plan === "monthly"
      ? t("monthlyLabel")
      : plan === "yearly"
        ? t("yearlyLabel")
        : t("stackLabel");
  const planCadence = (plan: CheckoutPlan) =>
    plan === "monthly"
      ? t("monthlyCadence")
      : plan === "yearly"
        ? t("yearlyCadence")
        : t("stackCadence");
  const planDescription = (plan: CheckoutPlan) =>
    plan === "monthly"
      ? t("monthlyPlanDescription")
      : plan === "yearly"
        ? t("yearlyPlanDescription")
        : t("stackPlanDescription");

  const handlePlanChange = (value: string) => {
    const isKnownPlan = resolvedPlanOptions.some(
      (option) => option.id === value,
    );
    if (isKnownPlan) {
      onPlanChange(value as CheckoutPlan);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="text-sm font-medium">{t("selectedPlan")}</div>
        <Select value={selectedPlan} onValueChange={handlePlanChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("selectPlan")} />
          </SelectTrigger>
          <SelectContent>
            {resolvedPlanOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {planName(option.id)} ({option.priceLabel})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p className="font-medium">{planName(selectedPlanOption.id)}</p>
        <p className="mt-1 text-base font-semibold">
          {selectedPlanOption.priceLabel}
        </p>
        <p className="text-muted-foreground">
          {planCadence(selectedPlanOption.id)}
        </p>
        <p className="text-muted-foreground">
          {t("currency", { code: selectedPlanOption.currencyCode })}
        </p>
        <p className="mt-2 text-muted-foreground">
          {planDescription(selectedPlanOption.id)}
        </p>
      </div>

      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
        <p className="font-medium">{trialHeadline}</p>
        <p className="mt-1 text-xs opacity-90">{trialDescription}</p>
      </div>

      <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200">
        <p className="inline-flex items-center gap-2 font-medium">
          <ShieldCheck className="h-4 w-4" />
          {t("secureCheckout")}
        </p>
        <p className="mt-1 text-xs opacity-90">{t("secureDescription")}</p>
      </div>
    </>
  );
};
