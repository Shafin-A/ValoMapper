import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getMatchTone, MATCH_TONE_CLASSES } from "@/lib/consts";
import {
  MatchPlayers,
  MatchRoundEvent,
  formatTimeSinceRoundStart,
  getKillEventImage,
  getPlayerAgentIconSrc,
  getPlayerSummary,
} from "@/lib/matches";
import Image from "next/image";

interface MatchEventLogProps {
  events: MatchRoundEvent[];
  players: MatchPlayers;
  currentPlayerPuuid?: string;
}

interface RoundEventRowProps {
  event: MatchRoundEvent;
  players: MatchPlayers;
  currentPlayerPuuid?: string;
}

const RoundEventRow = ({
  event,
  players,
  currentPlayerPuuid,
}: RoundEventRowProps) => {
  const actorPuuid =
    event.eventType === "kill"
      ? event.killerPuuid
      : event.eventType === "spike_planted"
        ? event.planterPuuid
        : event.defuserPuuid;
  const isActorCurrentPlayer = actorPuuid === currentPlayerPuuid;
  const isVictimCurrentPlayer =
    event.eventType === "kill" && event.victimPuuid === currentPlayerPuuid;

  const actorTeamId = getPlayerSummary(players, actorPuuid)?.teamId;
  const victimTeamId =
    event.eventType === "kill"
      ? getPlayerSummary(players, event.victimPuuid)?.teamId
      : undefined;
  const actorToneClasses =
    MATCH_TONE_CLASSES[getMatchTone(actorTeamId, isActorCurrentPlayer)];
  const victimToneClasses =
    MATCH_TONE_CLASSES[getMatchTone(victimTeamId, isVictimCurrentPlayer)];

  const leftAccent = actorToneClasses.accentBg;
  const rightAccent = victimToneClasses.accentBg;
  const iconShade = actorToneClasses.iconBg;
  const victimIconShade = victimToneClasses.iconBg;
  const contentShade = actorToneClasses.contentBg;

  if (event.eventType === "kill") {
    const killEventImage = getKillEventImage(event, players);

    return (
      <li className="relative isolate overflow-hidden border border-slate-800/80">
        <div className={`absolute inset-y-0 left-0 w-1.5 ${leftAccent}`} />
        <div className={`absolute inset-y-0 right-0 w-1.5 ${rightAccent}`} />

        <div className="relative z-10 px-2">
          <div className="grid grid-cols-[32px_50px_1fr_32px] items-stretch">
            <div className={`relative h-8 overflow-hidden ${iconShade}`}>
              <Image
                src={getPlayerAgentIconSrc(players, event.killerPuuid)}
                alt="Killer"
                fill
                sizes="32px"
                className="object-fill"
              />
            </div>

            <div className={`flex items-center justify-center ${contentShade}`}>
              <span className="text-xs font-semibold tabular-nums text-white">
                {formatTimeSinceRoundStart(event.timeSinceRoundStartMillis)}
              </span>
            </div>

            <div
              className={`flex min-w-0 items-center justify-center ${contentShade}`}
            >
              <div className="relative ml-3 h-4 w-full">
                <Image
                  src={killEventImage.src}
                  alt={killEventImage.alt}
                  fill
                  sizes="120px"
                  className={killEventImage.className}
                />
              </div>
            </div>

            <div className={`relative h-8 overflow-hidden ${victimIconShade}`}>
              <Image
                src={getPlayerAgentIconSrc(players, event.victimPuuid)}
                alt="Victim"
                fill
                sizes="32px"
                className="object-fill"
              />
            </div>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="relative isolate overflow-hidden border border-slate-800/80">
      <div className={`absolute inset-y-0 left-0 w-1.5 ${leftAccent}`} />

      <div className="relative z-10 pl-2 pr-0">
        <div className="grid grid-cols-[32px_50px_1fr_auto] items-stretch">
          <div className={`relative h-8 overflow-hidden ${iconShade}`}>
            <Image
              src={getPlayerAgentIconSrc(players, actorPuuid)}
              alt="Player"
              fill
              sizes="32px"
              className="object-fill"
            />
          </div>

          <div className={`flex items-center justify-center ${contentShade}`}>
            <span className="text-xs font-semibold tabular-nums text-white">
              {formatTimeSinceRoundStart(event.timeSinceRoundStartMillis)}
            </span>
          </div>

          <div className={`min-w-0 ${contentShade}`}>
            <div className="relative h-8 w-full px-2">
              {event.eventType === "spike_planted" ? (
                <Image
                  src="/tools/spike.webp"
                  alt="Spike"
                  fill
                  sizes="32px"
                  className="object-contain object-right scale-[-0.65]"
                />
              ) : (
                <Image
                  src="/matchOutcomes/defuse.png"
                  alt="Defuse"
                  fill
                  sizes="32px"
                  className="object-contain object-left scale-[0.7]"
                />
              )}
            </div>
          </div>

          <div className={`flex items-center pl-2 pr-0 ${contentShade}`}>
            <span className="pr-1 text-sm tracking-[0.04em] text-white/90">
              {event.eventType === "spike_planted" ? "Planted" : "Defused"}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
};

export const MatchEventLog = ({
  events,
  players,
  currentPlayerPuuid,
}: MatchEventLogProps) => {
  return (
    <div className="md:h-[652px]">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/55">
        Event Log
      </p>
      <ScrollArea className="h-[360px] w-full md:h-[620px]">
        <ol className="space-y-1 pr-2">
          {events.map((event, index) => (
            <RoundEventRow
              key={`${event.eventType}-${index}`}
              event={event}
              players={players}
              currentPlayerPuuid={currentPlayerPuuid}
            />
          ))}
        </ol>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
};
