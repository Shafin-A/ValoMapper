"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import {
  getBillingSuccessReturnLabel,
  normalizeBillingReturnPath,
} from "@/lib/billing-return-path";

const BillingSuccessPage = () => {
  const searchParams = useSearchParams();
  const returnToPath = normalizeBillingReturnPath(
    searchParams.get("returnTo"),
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
          <h1 className="text-3xl font-bold">Welcome to ValoMapper Pro!</h1>
          <p className="text-foreground/85">
            Thanks for upgrading. Your ValoMapper Pro subscription is now
            active.
          </p>
          <p className="text-sm text-foreground/70">
            It may take a moment for your account to reflect the change.
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
