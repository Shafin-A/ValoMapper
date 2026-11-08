import { LoginForm } from "@/components/auth-forms/login-form";
import { CenteredPageShell } from "@/components/shared/centered-page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

const LoginPage = () => {
  return (
    <CenteredPageShell>
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </CenteredPageShell>
  );
};

const LoginFormSkeleton = () => {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
