import { MatchEventLog } from "@/components/matches/match-event-log";
import { MatchPlayerStatsTable } from "@/components/matches/match-player-stats-table";
import { MatchRoundSelector } from "@/components/matches/match-round-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  getMatchResultTone,
  MATCH_PAGE_CLASSES,
  MATCH_RESULT_CLASSES,
} from "@/lib/consts";
import {
  getPlayerSummary,
  getRoundOutcomeIconSrc,
  getRoundOutcomeText,
} from "@/lib/matches";
import { MatchSummaryResponse } from "@/lib/types";
import { AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface MatchDetailsProps {
  matchId: string;
  matchSummary: MatchSummaryResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void | Promise<unknown>;
  selectedRoundNumber: number;
  onSelectRound: (roundNumber: number) => void;
}

export const MatchDetails = ({
  matchId,
  matchSummary,
  isLoading,
  isError,
  error,
  onRetry,
  selectedRoundNumber,
  onSelectRound,
}: MatchDetailsProps) => {
  if (isLoading) {
    return (
      <section className="rounded-b-xl border border-slate-700 bg-slate-950/90 px-4 py-8 sm:px-5">
        <div className="flex items-center justify-center gap-3 text-slate-200">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading match summary...</span>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="rounded-b-xl border border-slate-700 bg-slate-950/90 px-4 py-4 sm:px-5">
        <div className="space-y-3">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load match summary</AlertTitle>
            <AlertDescription>
              {error?.message ||
                "Something went wrong while loading the selected match."}
            </AlertDescription>
          </Alert>
          <Button size="sm" onClick={() => void onRetry()}>
            Try Again
          </Button>
        </div>
      </section>
    );
  }

  if (!matchSummary) {
    return null;
  }

  const players = matchSummary.players;
  const currentPlayerPuuid = matchSummary.viewer?.puuid;
  const currentPlayerBestRoundNumber = matchSummary.viewer?.bestRoundNumber;
  const currentPlayerTeamId = currentPlayerPuuid
    ? getPlayerSummary(players, currentPlayerPuuid)?.teamId
    : undefined;
  const selectedRound =
    matchSummary.rounds.find(
      (round) => round.roundNumber === selectedRoundNumber,
    ) ?? matchSummary.rounds[0];

  if (!selectedRound) {
    return null;
  }

  const roundOutcomeTone = currentPlayerTeamId
    ? getMatchResultTone(selectedRound.winningTeam === currentPlayerTeamId)
    : undefined;
  const roundOutcomeTextClass = roundOutcomeTone
    ? MATCH_RESULT_CLASSES[roundOutcomeTone].accentText
    : "text-white";

  return (
    <section className="rounded-b-xl border border-slate-700 bg-slate-950/90 px-4 py-4 sm:px-5">
      <div className="space-y-4">
        <MatchRoundSelector
          rounds={matchSummary.rounds}
          selectedRoundNumber={selectedRound.roundNumber}
          currentPlayerTeamId={currentPlayerTeamId}
          currentPlayerBestRoundNumber={currentPlayerBestRoundNumber}
          onSelectRound={onSelectRound}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-semibold uppercase text-white sm:text-xl">
            Round {selectedRound.roundNumber}
            <span className="px-1 font-normal">|</span>
            <span
              className={`inline-flex min-w-0 flex-wrap items-center gap-1 font-semibold sm:gap-2 ${roundOutcomeTextClass}`}
            >
              <Image
                src={getRoundOutcomeIconSrc(
                  selectedRound.roundResultCode,
                  selectedRound.winningTeam,
                  currentPlayerTeamId,
                  false,
                )}
                alt={`${selectedRound.roundResultCode} icon`}
                width={24}
                height={24}
                className="h-4 w-4 shrink-0 sm:h-6 sm:w-6"
              />
              <span className="text-base leading-tight sm:text-xl">
                (
                {getRoundOutcomeText(
                  selectedRound.roundResultCode,
                  selectedRound.winningTeam,
                  currentPlayerTeamId,
                )}
                )
              </span>
              {selectedRound.roundNumber === currentPlayerBestRoundNumber && (
                <span
                  className={`block w-full text-base leading-tight ${MATCH_PAGE_CLASSES.bestRoundText} sm:inline sm:w-auto sm:text-xl`}
                >
                  (Your Best Round)
                </span>
              )}
            </span>
          </div>

          <Button size="sm" asChild>
            <Link
              href={`/matches/${encodeURIComponent(matchId)}?round=${selectedRound.roundNumber}`}
            >
              Load Round
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            <MatchPlayerStatsTable
              players={players}
              round={selectedRound}
              currentPlayerPuuid={currentPlayerPuuid}
            />
          </div>

          <MatchEventLog
            events={selectedRound.eventLog}
            players={players}
            currentPlayerPuuid={currentPlayerPuuid}
          />
        </div>
      </div>
    </section>
  );
};
