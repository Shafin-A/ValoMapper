import { Suspense } from "react";
import { RSOCallbackContent } from "@/components/auth/rso-callback-content";

export const metadata = {
  title: "Linking Riot Account...",
};

export default function RSOCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Suspense fallback={<div>Processing Riot login...</div>}>
        <RSOCallbackContent />
      </Suspense>
    </div>
  );
}
