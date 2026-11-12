"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/cn";
import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";

export const REPLAY_WARNINGS_DEBUG_KEY = "valomapper-debug-replay-warnings";

export const ReplayWarningsBanner = ({
  warnings,
  replayId,
  className,
}: {
  warnings?: string[];
  replayId: string;
  className?: string;
}) => {
  const [dismissedReplayIds, setDismissedReplayIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const messages = warnings ?? [];

  useEffect(() => {
    setIsDebugEnabled(
      window.localStorage.getItem(REPLAY_WARNINGS_DEBUG_KEY) === "true",
    );
  }, []);

  if (
    !isDebugEnabled ||
    messages.length === 0 ||
    dismissedReplayIds.has(replayId)
  ) {
    return null;
  }

  const countLabel = `${messages.length} warning${messages.length === 1 ? "" : "s"}`;

  return (
    <Alert
      className={cn(
        "relative border-amber-400/40 bg-amber-400/10 pr-10 text-amber-50",
        className,
      )}
    >
      <AlertTriangle className="text-amber-300" />
      <AlertTitle>Replay loaded with {countLabel}</AlertTitle>
      <AlertDescription className="text-amber-100/80">
        <button
          type="button"
          className="underline underline-offset-2 hover:text-amber-50"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? "Hide details" : "Show details"}
        </button>
        {isExpanded && (
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
            {messages.map((message, index) => (
              <li key={`${index}-${message}`}>{message}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
      <button
        type="button"
        aria-label="Dismiss replay warnings"
        className="absolute right-2 top-2 rounded-sm p-1 text-amber-200/80 transition-colors hover:bg-amber-300/10 hover:text-amber-50"
        onClick={() =>
          setDismissedReplayIds((dismissed) => {
            const next = new Set(dismissed);
            next.add(replayId);
            return next;
          })
        }
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
};
