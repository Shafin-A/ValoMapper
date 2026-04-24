import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getMatchTone, MATCH_TONE_CLASSES } from "@/lib/consts";
import {
  MatchPlayers,
  MatchRound,
  getAgentImageSrc,
  getPlayerSummary,
} from "@/lib/matches";
import Image from "next/image";

interface MatchPlayerStatsTableProps {
  players: MatchPlayers;
  round: MatchRound;
  currentPlayerPuuid?: string;
}

export const MatchPlayerStatsTable = ({
  players,
  round,
  currentPlayerPuuid,
}: MatchPlayerStatsTableProps) => {
  return (
    <ScrollArea className="w-full">
      <div className="min-w-[640px] pr-2 sm:min-w-[720px]">
        <div className="mb-2 grid grid-cols-[48px_minmax(140px,1fr)_64px_44px_44px_44px_100px] items-center text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55 sm:grid-cols-[56px_minmax(172px,1fr)_80px_52px_52px_52px_120px] sm:text-[12px]">
          <span className="text-center">Player</span>
          <span aria-hidden="true" />
          <span className="text-center">Score</span>
          <span className="text-center">K</span>
          <span className="text-center">D</span>
          <span className="text-center">A</span>
          <span className="text-center">Econ</span>
        </div>

        {round.playerStats.flatMap((stats, index, allStats) => {
          const player = getPlayerSummary(players, stats.puuid);
          const isCurrentPlayer = stats.puuid === currentPlayerPuuid;
          const rowToneClasses =
            MATCH_TONE_CLASSES[getMatchTone(player?.teamId, isCurrentPlayer)];

          const rowAccent = rowToneClasses.accentBg;
          const iconShade = rowToneClasses.iconBg;
          const identityShade = rowToneClasses.identityBg;
          const scoreShade = rowToneClasses.scoreBg;
          const statsShade = rowToneClasses.contentBg;

          const nextStats = allStats[index + 1];
          const nextTeamId = nextStats
            ? getPlayerSummary(players, nextStats.puuid)?.teamId
            : undefined;
          const shouldInsertTeamGap =
            player?.teamId === "Blue" && nextTeamId === "Red";

          const row = (
            <article
              key={stats.puuid}
              className="relative isolate mb-1 overflow-hidden border border-slate-800/80"
            >
              <div className={`absolute inset-y-0 left-0 w-1.5 ${rowAccent}`} />

              <div className="relative z-30 pl-2">
                <div className="grid grid-cols-[48px_minmax(140px,1fr)_64px_44px_44px_44px_100px] items-stretch sm:grid-cols-[56px_minmax(172px,1fr)_80px_52px_52px_52px_120px]">
                  <div className={`relative overflow-hidden ${iconShade}`}>
                    <div className="relative h-full min-h-12 w-full sm:min-h-14">
                      <Image
                        src={getAgentImageSrc(player?.characterName ?? "Astra")}
                        alt={player?.characterName ?? "Agent"}
                        fill
                        sizes="56px"
                        className="object-fill"
                      />
                    </div>
                  </div>

                  <div
                    className={`min-w-0 px-2 py-2 sm:px-3 sm:py-2.5 ${identityShade}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold leading-none text-white sm:text-lg">
                        {player?.gameName ?? "Player"}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold leading-none text-white/55 sm:text-sm">
                        {player?.characterName ?? "Unknown Agent"}
                      </p>
                    </div>
                  </div>

                  <p
                    className={`flex items-center justify-center text-center text-base font-semibold text-white sm:text-lg ${scoreShade}`}
                  >
                    {stats.score}
                  </p>

                  <p
                    className={`flex items-center justify-center text-center text-base font-semibold text-white sm:text-lg ${statsShade}`}
                  >
                    {stats.kills}
                  </p>
                  <p
                    className={`flex items-center justify-center text-center text-base font-semibold text-white sm:text-lg ${statsShade}`}
                  >
                    {stats.deaths}
                  </p>
                  <p
                    className={`flex items-center justify-center text-center text-base font-semibold text-white sm:text-lg ${statsShade}`}
                  >
                    {stats.assists}
                  </p>
                  <div
                    className={`flex flex-col items-center justify-center text-center leading-tight ${statsShade}`}
                  >
                    <p className="text-base font-semibold text-white sm:text-lg">
                      {stats.economy.loadoutValue}
                    </p>
                    <p className="text-base font-semibold text-white/55 sm:text-lg">
                      {stats.economy.remaining}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );

          if (!shouldInsertTeamGap) {
            return [row];
          }

          return [
            row,
            <div
              key={`team-gap-${stats.puuid}`}
              className="h-1.5"
              aria-hidden="true"
            />,
          ];
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
