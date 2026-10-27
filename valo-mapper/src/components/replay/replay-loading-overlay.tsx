"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ReplayLoadProgress } from "@/lib/replay/types";
import { AlertCircle, Loader2 } from "lucide-react";

export const ReplayLoadingOverlay = ({
  progress,
  error,
  onRetry,
  onBack,
}: {
  progress?: ReplayLoadProgress | null;
  error?: string | null;
  onRetry?: () => void;
  onBack?: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
        {error ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Could not open replay</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2">
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  Back
                </Button>
              )}
              {onRetry && <Button onClick={onRetry}>Try again</Button>}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div>
                <p className="text-base font-semibold text-white">
                  {progress?.label ?? "Reading replay…"}
                </p>
                <p className="text-xs text-white/45">
                  Parsing is running locally for this demo.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${progress?.percent ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-white/40">
                <span>Loading replay</span>
                <span>{Math.round(progress?.percent ?? 0)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
