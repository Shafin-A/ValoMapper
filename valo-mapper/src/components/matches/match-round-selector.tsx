import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MATCH_PAGE_CLASSES } from "@/lib/consts";
import { MatchRound, getRoundOutcomeIconSrc } from "@/lib/matches";
import { RefreshCw } from "lucide-react";
import Image from "next/image";

interface MatchRoundSelectorProps {
  rounds: MatchRound[];
  selectedRoundNumber: number;
  currentPlayerTeamId?: string;
  currentPlayerBestRoundNumber?: number;
  queueLabel?: string;
  onSelectRound: (roundNumber: number) => void;
}

const STANDARD_ROUNDS_PER_HALF = 12;
const SWIFTPLAY_ROUNDS_PER_HALF = 4;

type RoundWithAttackSide = MatchRound & { attackTeamId?: string };

const normalizeQueueLabel = (queueLabel?: string) =>
  (queueLabel ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

export const getRoundsPerHalf = (
  rounds: MatchRound[],
  queueLabel?: string,
): number => {
  const queue = normalizeQueueLabel(queueLabel);
  if (queue.includes("swiftplay")) {
    return SWIFTPLAY_ROUNDS_PER_HALF;
  }
  if (queue === "competitive" || queue === "unrated" || queue === "custom") {
    return STANDARD_ROUNDS_PER_HALF;
  }

  const firstAttackTeamId = (rounds[0] as RoundWithAttackSide | undefined)
    ?.attackTeamId;
  if (firstAttackTeamId) {
    const switched = rounds.find(
      (round, index) =>
        index > 0 &&
        (round as RoundWithAttackSide).attackTeamId &&
        (round as RoundWithAttackSide).attackTeamId !== firstAttackTeamId,
    );
    if (switched) {
      return switched.roundNumber - 1;
    }
  }

  return rounds.length > 0 && rounds.length <= 9
    ? SWIFTPLAY_ROUNDS_PER_HALF
    : STANDARD_ROUNDS_PER_HALF;
};

export const MatchRoundSelector = ({
  rounds,
  selectedRoundNumber,
  currentPlayerTeamId,
  currentPlayerBestRoundNumber,
  queueLabel,
  onSelectRound,
}: MatchRoundSelectorProps) => {
  const roundsPerHalf = getRoundsPerHalf(rounds, queueLabel);

  return (
    <ScrollArea className="w-full pb-3">
      <div className="inline-flex min-w-full gap-2">
        {rounds.map((round, index) => {
          const isSelected = round.roundNumber === selectedRoundNumber;
          const roundButton = (
            <button
              key={`round-${round.roundNumber}`}
              type="button"
              onClick={() => onSelectRound(round.roundNumber)}
              className={`h-16 min-w-14 shrink-0 text-sm font-semibold transition-colors ${
                isSelected
                  ? MATCH_PAGE_CLASSES.roundSelectorSelected
                  : MATCH_PAGE_CLASSES.roundSelectorIdle
              }`}
            >
              <span className="flex h-full flex-col items-center justify-center gap-4 leading-none">
                <span className="text-[14px] font-semibold uppercase tracking-[0.08em]">
                  {round.roundNumber}
                </span>
                <Image
                  src={getRoundOutcomeIconSrc(
                    round.roundResultCode,
                    round.winningTeam,
                    currentPlayerTeamId,
                    round.roundNumber === (currentPlayerBestRoundNumber ?? -1),
                  )}
                  alt={`${round.roundResultCode} icon`}
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
              </span>
            </button>
          );

          const showHalfSeparator =
            round.roundNumber === roundsPerHalf && index < rounds.length - 1;

          if (!showHalfSeparator) {
            return roundButton;
          }

          return [
            roundButton,
            <span
              key={`round-half-separator-${round.roundNumber}`}
              data-testid="round-half-separator"
              data-round={round.roundNumber}
              aria-hidden="true"
              className="inline-flex h-16 min-w-8 shrink-0 items-center justify-center text-white"
            >
              <RefreshCw className="h-5 w-5" strokeWidth={3} />
            </span>,
          ];
        })}
      </div>
      <ScrollBar orientation="horizontal" className="mt-2" />
    </ScrollArea>
  );
};
