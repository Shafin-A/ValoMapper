import { Suspense } from "react";
import { RSOCallbackContent } from "@/components/auth/rso-callback-content";

export const metadata = {
  title: "Linking Riot Account...",
};

const RSOCallbackPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center text-card-foreground shadow-sm">
        <Suspense
          fallback={
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Processing Riot login...</h1>
              <p className="text-sm text-foreground/70">
                Please wait while we complete account linking.
              </p>
            </div>
          }
        >
          <RSOCallbackContent />
        </Suspense>
      </div>
    </div>
  );
};

export default RSOCallbackPage;
