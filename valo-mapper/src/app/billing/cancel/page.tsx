import Link from "next/link";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import {
  getBillingCancelReturnLabel,
  normalizeBillingReturnPath,
} from "@/lib/billing-return-path";

type BillingCancelPageProps = {
  searchParams?: Promise<{
    returnTo?: string | string[];
  }>;
};

const getSearchParamValue = (value: string | string[] | undefined) => {
  return Array.isArray(value) ? value[0] : value;
};

const BillingCancelPage = async ({ searchParams }: BillingCancelPageProps) => {
  const resolvedSearchParams = await searchParams;
  const returnToPath = normalizeBillingReturnPath(
    getSearchParamValue(resolvedSearchParams?.returnTo),
    "/",
  );
  const returnLabel = getBillingCancelReturnLabel(returnToPath);
  const secondaryHref = returnToPath === "/strategies" ? "/" : "/strategies";
  const secondaryLabel =
    secondaryHref === "/" ? "Back to Home" : "My Strategies";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center text-card-foreground shadow-sm space-y-6">
        <div className="flex justify-center">
          <XCircle className="h-16 w-16 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Checkout Cancelled</h1>
          <p className="text-foreground/80">
            No charges were made. You can upgrade to ValoMapper Premium anytime
            to unlock unlimited strategy saves.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link href={returnToPath}>{returnLabel}</Link>
          </Button>
          <Button asChild>
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BillingCancelPage;
