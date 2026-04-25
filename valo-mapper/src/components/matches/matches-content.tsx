import { Button } from "@/components/ui/button";
import { MatchCard } from "@/components/matches/match-card";
import { MatchDetails } from "@/components/matches/match-details";
import { MatchSummaryResponse, MatchPreview } from "@/lib/types";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

interface MatchesContentProps {
  matches: MatchPreview[];
  totalMatches: number;
  expandedMatchId: string | null;
  expandedMatchSummary?: MatchSummaryResponse;
  isMatchSummaryLoading: boolean;
  isMatchSummaryError: boolean;
  matchSummaryError: Error | null;
  hasMoreMatches: boolean;
  isFetchingNextMatches: boolean;
  isFetchNextMatchesError: boolean;
  selectedRoundByMatch: Record<string, number>;
  onToggleMatch: (matchId: string) => void;
  onSelectRound: (matchId: string, roundNumber: number) => void;
  onRetryMatchSummary: () => void | Promise<unknown>;
  onLoadMoreMatches: () => void | Promise<unknown>;
}

export const MatchesContent = ({
  matches,
  totalMatches,
  expandedMatchId,
  expandedMatchSummary,
  isMatchSummaryLoading,
  isMatchSummaryError,
  matchSummaryError,
  hasMoreMatches,
  isFetchingNextMatches,
  isFetchNextMatchesError,
  selectedRoundByMatch,
  onToggleMatch,
  onSelectRound,
  onRetryMatchSummary,
  onLoadMoreMatches,
}: MatchesContentProps) => {
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMoreMatches || isFetchingNextMatches) {
      return;
    }

    const trigger = loadMoreTriggerRef.current;
    if (!trigger || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void onLoadMoreMatches();
        }
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(trigger);

    return () => observer.disconnect();
  }, [hasMoreMatches, isFetchingNextMatches, onLoadMoreMatches]);

  return (
    <section className="space-y-px">
      {matches.map((match) => {
        const isExpanded = expandedMatchId === match.matchId;
        const matchSummary = isExpanded ? (expandedMatchSummary ?? null) : null;
        const selectedRoundNumber =
          selectedRoundByMatch[match.matchId] ??
          matchSummary?.rounds[0]?.roundNumber ??
          1;

        return (
          <div key={match.matchId}>
            <MatchCard
              match={match}
              onToggle={() => onToggleMatch(match.matchId)}
            />

            {isExpanded && (
              <MatchDetails
                matchSummary={matchSummary}
                isLoading={isMatchSummaryLoading}
                isError={isMatchSummaryError}
                error={matchSummaryError}
                onRetry={onRetryMatchSummary}
                selectedRoundNumber={selectedRoundNumber}
                onSelectRound={(roundNumber) =>
                  onSelectRound(match.matchId, roundNumber)
                }
              />
            )}
          </div>
        );
      })}

      <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Showing {matches.length} of {totalMatches} matches
        </p>

        {hasMoreMatches ? (
          <>
            <div ref={loadMoreTriggerRef} className="h-px w-full" aria-hidden />
            <Button
              variant="outline"
              onClick={() => void onLoadMoreMatches()}
              disabled={isFetchingNextMatches}
            >
              {isFetchingNextMatches ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading more matches...
                </>
              ) : (
                "Load more matches"
              )}
            </Button>
          </>
        ) : totalMatches > 0 ? (
          <p className="text-sm text-muted-foreground">
            All matches are loaded.
          </p>
        ) : null}

        {isFetchNextMatchesError ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Unable to load more matches right now.
          </p>
        ) : null}
      </div>
    </section>
  );
};
