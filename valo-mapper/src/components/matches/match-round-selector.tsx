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
  onSelectRound: (roundNumber: number) => void;
}

export const MatchRoundSelector = ({
  rounds,
  selectedRoundNumber,
  currentPlayerTeamId,
  currentPlayerBestRoundNumber,
  onSelectRound,
}: MatchRoundSelectorProps) => {
  return (
    <ScrollArea className="w-full pb-3">
      <div className="inline-flex min-w-full gap-2">
        {rounds.map((round) => {
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

          if (round.roundNumber !== 12) {
            return roundButton;
          }

          return [
            roundButton,
            <span
              key={`round-half-separator-${round.roundNumber}`}
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
