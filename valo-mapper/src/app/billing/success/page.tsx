import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import {
  getBillingSuccessReturnLabel,
  normalizeBillingReturnPath,
} from "@/lib/billing-return-path";
import { PREMIUM_TRIAL_DAYS } from "@/lib/consts";

type BillingSuccessPageProps = {
  searchParams?: Promise<{
    returnTo?: string | string[];
  }>;
};

const getSearchParamValue = (value: string | string[] | undefined) => {
  return Array.isArray(value) ? value[0] : value;
};

const BillingSuccessPage = async ({
  searchParams,
}: BillingSuccessPageProps) => {
  const resolvedSearchParams = await searchParams;
  const returnToPath = normalizeBillingReturnPath(
    getSearchParamValue(resolvedSearchParams?.returnTo),
    "/strategies",
  );
  const returnLabel = getBillingSuccessReturnLabel(returnToPath);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center text-card-foreground shadow-sm space-y-6">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Welcome to ValoMapper Premium!</h1>
          <p className="text-foreground/85">
            Thanks for upgrading. Your ValoMapper Premium subscription is now
            active.
          </p>
          <p className="text-sm text-foreground/70">
            If you chose to start on trial, monthly billing begins automatically
            after
            {` ${PREMIUM_TRIAL_DAYS} days`}.
          </p>
          <p className="text-sm text-foreground/70">
            It may take a moment for your account status to refresh.
          </p>
        </div>
        <Button asChild>
          <Link href={returnToPath}>{returnLabel}</Link>
        </Button>
      </div>
    </div>
  );
};

export default BillingSuccessPage;
