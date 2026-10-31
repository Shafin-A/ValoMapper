"use client";

import { RoundEventRow } from "@/components/matches/match-event-log";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { formatReplayTime } from "@/lib/replay/display";
import type { ReplayRound } from "@/lib/replay/types";
import type { MatchPlayers } from "@/lib/matches";
import { cn } from "@/lib/utils";

const getMarkerClassName = (
  event: ReplayRound["eventLog"][number],
  players: MatchPlayers,
) => {
  if (event.eventType === "spike_planted") {
    return "bg-amber-300";
  }

  if (event.eventType === "spike_defused") {
    return "bg-cyan-300";
  }

  if (event.eventType === "spike_exploded") {
    return "bg-rose-400";
  }

  const killer = players.find((player) => player.puuid === event.killerPuuid);
  return killer?.teamId === "Blue" ? "bg-[#42EEC7]" : "bg-[#FF4655]";
};

const getMarkerPlacementClassName = (
  event: ReplayRound["eventLog"][number],
  players: MatchPlayers,
) => {
  if (event.eventType !== "kill") {
    return "top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-sm";
  }

  const killer = players.find((player) => player.puuid === event.killerPuuid);

  if (killer?.teamId === "Blue") {
    return "top-1/2 h-5 w-0.5 -translate-y-[17px] rounded-sm";
  }

  return "top-1/2 h-5 w-0.5 -translate-y-[3px] rounded-sm";
};

const getMarkerAriaLabel = (
  event: ReplayRound["eventLog"][number],
  players: MatchPlayers,
) => {
  const time = formatReplayTime(event.timeSinceRoundStartMillis);

  if (event.eventType === "spike_planted") {
    return `${time} — Spike planted`;
  }

  if (event.eventType === "spike_defused") {
    return `${time} — Spike defused`;
  }

  if (event.eventType === "spike_exploded") {
    return `${time} — Spike detonated`;
  }

  const killer = players.find((player) => player.puuid === event.killerPuuid);
  const victim = players.find((player) => player.puuid === event.victimPuuid);

  return `${time} — ${killer?.characterName ?? "Unknown"} killed ${
    victim?.characterName ?? "Unknown"
  }`;
};

export const ReplayTimeline = ({
  round,
  players,
  currentTimeMs,
  onSeek,
}: {
  round: ReplayRound;
  players: MatchPlayers;
  currentTimeMs: number;
  onSeek: (timeMs: number) => void;
}) => {
  const barrierDropTimeMs = round.buyEndTimeMs;

  return (
    <div className="relative w-full">
      <Slider
        value={[Math.min(currentTimeMs, round.durationMs)]}
        min={0}
        max={round.durationMs}
        step={100}
        onValueChange={([value]) => onSeek(value)}
        aria-label="Replay timeline"
        className="**:data-[slot=slider-thumb]:relative **:data-[slot=slider-thumb]:z-10"
      />
      {typeof barrierDropTimeMs === "number" &&
        barrierDropTimeMs > 0 &&
        barrierDropTimeMs <= round.durationMs && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`${formatReplayTime(barrierDropTimeMs)} — Barrier drop`}
                onClick={() => onSeek(barrierDropTimeMs)}
                className="absolute top-1/2 z-1 h-6 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white/70"
                style={{
                  left: `${Math.min(
                    100,
                    (barrierDropTimeMs / Math.max(1, round.durationMs)) * 100,
                  )}%`,
                }}
              />
            </TooltipTrigger>
            <TooltipContent side="top" align="center" sideOffset={8} hideArrow>
              {formatReplayTime(barrierDropTimeMs)} — Barrier drop
            </TooltipContent>
          </Tooltip>
        )}
      {round.eventLog.map((event, index) => {
        const left = Math.max(
          0,
          Math.min(
            100,
            (event.timeSinceRoundStartMillis / Math.max(1, round.durationMs)) *
              100,
          ),
        );
        const placementClassName = getMarkerPlacementClassName(event, players);

        return (
          <Tooltip key={`${event.eventType}-${index}`}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={getMarkerAriaLabel(event, players)}
                onClick={() => onSeek(event.timeSinceRoundStartMillis)}
                className={cn(
                  "absolute z-1 -translate-x-1/2",
                  placementClassName,
                  getMarkerClassName(event, players),
                )}
                style={{ left: `${left}%` }}
              />
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="center"
              sideOffset={8}
              hideArrow
              className="w-64 overflow-hidden border border-slate-800/80 bg-slate-950 p-0 text-slate-100 shadow-xl"
            >
              <ol>
                <RoundEventRow event={event} players={players} />
              </ol>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
