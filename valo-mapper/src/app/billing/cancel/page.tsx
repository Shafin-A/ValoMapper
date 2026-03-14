import Link from "next/link";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const BillingCancelPage = () => {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <XCircle className="h-16 w-16 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Checkout Cancelled</h1>
          <p className="text-muted-foreground">
            No charges were made. You can upgrade anytime to unlock unlimited
            strategy saves.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
          <Button asChild>
            <Link href="/strategies">My Strategies</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BillingCancelPage;
