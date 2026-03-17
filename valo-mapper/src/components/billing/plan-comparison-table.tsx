import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { type BillingPlansResponse } from "@/hooks/api/use-billing-plans";
import { type CheckoutPlan, type CheckoutPlanOption } from "@/lib/consts";

type ComparisonPlanId = "free" | CheckoutPlan;

interface ComparisonColumn {
  id: ComparisonPlanId;
  shortLabel: string;
  priceLabel: string;
  perMonthLabel: string;
  savingsBadge: string;
  isSelected: boolean;
}

interface FeatureRow {
  label: string;
  description: string;
  values: Record<ComparisonPlanId, boolean>;
}

const FEATURE_ROWS: FeatureRow[] = [
  {
    label: "Create strategies",
    description: "Available on every plan, including free",
    values: { free: true, monthly: true, yearly: true, stack: true },
  },
  {
    label: "Save unlimited strategies",
    description: "Free plan is limited to 3 strategies",
    values: { free: false, monthly: true, yearly: true, stack: true },
  },
  {
    label: "Organize strategies in folders",
    description: "Not available on the free plan",
    values: { free: false, monthly: true, yearly: true, stack: true },
  },
  {
    label: "Share premium membership with 5 others",
    description: "Only available on the Stack plan",
    values: { free: false, monthly: false, yearly: false, stack: true },
  },
];

interface PlanComparisonTableProps {
  resolvedPlanOptions: CheckoutPlanOption[];
  billingPlans: BillingPlansResponse | undefined;
  selectedPlan: CheckoutPlan;
}

export const PlanComparisonTable = ({
  resolvedPlanOptions,
  billingPlans,
  selectedPlan,
}: PlanComparisonTableProps) => {
  const comparisonColumns = useMemo<ComparisonColumn[]>(() => {
    const monthlyAmount = billingPlans?.monthly?.unitAmount ?? 499;
    const yearlyAmount = billingPlans?.yearly?.unitAmount ?? 4499;
    const stackAmount = billingPlans?.stack?.unitAmount ?? 12499;
    const currency = (billingPlans?.monthly?.currency ?? "usd").toUpperCase();

    const fmt = (cents: number) =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(cents / 100);

    const yearlyPerMonth = yearlyAmount / 12;
    const yearlySavingsPct = Math.round(
      (1 - yearlyPerMonth / monthlyAmount) * 100,
    );
    const stackPerMemberMonth = stackAmount / 12 / 6;

    const paidColumns: ComparisonColumn[] = resolvedPlanOptions.map(
      (option) => ({
        id: option.id,
        shortLabel:
          option.id === "monthly"
            ? "Monthly"
            : option.id === "yearly"
              ? "Yearly"
              : "Stack",
        priceLabel: option.priceLabel,
        perMonthLabel:
          option.id === "yearly"
            ? `${fmt(yearlyPerMonth)}/mo`
            : option.id === "stack"
              ? `${fmt(stackPerMemberMonth)}/mo per member`
              : "",
        savingsBadge: option.id === "yearly" ? `Save ${yearlySavingsPct}%` : "",
        isSelected: option.id === selectedPlan,
      }),
    );

    return [
      {
        id: "free",
        shortLabel: "Free",
        priceLabel: "",
        perMonthLabel: "",
        savingsBadge: "",
        isSelected: false,
      },
      ...paidColumns,
    ];
  }, [resolvedPlanOptions, billingPlans, selectedPlan]);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Plans</div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full table-fixed min-w-[720px] border-collapse text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="w-1/5 px-4 py-3 align-top font-medium">Feature</th>
              {comparisonColumns.map((col) => (
                <th
                  key={col.id}
                  className={`w-1/5 px-4 py-3 align-top font-medium ${
                    col.isSelected ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <div>{col.shortLabel}</div>
                    {col.priceLabel && (
                      <div className="text-base font-semibold text-foreground">
                        {col.priceLabel}
                      </div>
                    )}
                    {col.perMonthLabel && (
                      <div className="text-xs text-muted-foreground">
                        {col.perMonthLabel}
                      </div>
                    )}
                    {col.savingsBadge && (
                      <div className="inline-block self-start rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {col.savingsBadge}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURE_ROWS.map((feature) => (
              <tr key={feature.label}>
                <td className="border-t px-4 py-3 align-top">
                  <div className="space-y-1">
                    <div className="font-medium">{feature.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {feature.description}
                    </div>
                  </div>
                </td>
                {comparisonColumns.map((col) => {
                  const included = feature.values[col.id];

                  return (
                    <td
                      key={col.id}
                      className={`border-t px-4 py-3 text-center align-middle ${
                        col.isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <span className="inline-flex items-center justify-center">
                        {included ? (
                          <Check
                            className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                            aria-label="Included"
                          />
                        ) : (
                          <X
                            className="h-4 w-4 text-muted-foreground/70"
                            aria-label="Not included"
                          />
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Compare included features here, then use the select below to choose a
        plan.
      </p>
    </div>
  );
};
