import { MatchCard } from "@/components/matches/match-card";
import { MatchDetails } from "@/components/matches/match-details";
import { MatchSummaryResponse, MatchPreview } from "@/lib/types";

interface MatchesContentProps {
  matches: MatchPreview[];
  expandedMatchId: string | null;
  expandedMatchSummary?: MatchSummaryResponse;
  isMatchSummaryLoading: boolean;
  isMatchSummaryError: boolean;
  matchSummaryError: Error | null;
  selectedRoundByMatch: Record<string, number>;
  onToggleMatch: (matchId: string) => void;
  onSelectRound: (matchId: string, roundNumber: number) => void;
  onRetryMatchSummary: () => void | Promise<unknown>;
}

export const MatchesContent = ({
  matches,
  expandedMatchId,
  expandedMatchSummary,
  isMatchSummaryLoading,
  isMatchSummaryError,
  matchSummaryError,
  selectedRoundByMatch,
  onToggleMatch,
  onSelectRound,
  onRetryMatchSummary,
}: MatchesContentProps) => {
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
    </section>
  );
};
