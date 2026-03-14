import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const BillingSuccessPage = () => {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Welcome to ValoMapper Pro!</h1>
          <p className="text-muted-foreground">
            Thanks for upgrading. Your ValoMapper Pro subscription is now
            active.
          </p>
          <p className="text-sm text-muted-foreground">
            It may take a moment for your account to reflect the change.
          </p>
        </div>
        <Button asChild>
          <Link href="/strategies">Go to My Strategies</Link>
        </Button>
      </div>
    </div>
  );
};

export default BillingSuccessPage;
