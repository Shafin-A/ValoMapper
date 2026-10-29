"use client";

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

const getMarkerLabel = (
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

  return `${time} — ${killer?.gameName ?? "Unknown"} killed ${
    victim?.gameName ?? "Unknown"
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
    <div className="w-full space-y-1.5">
      <div className="relative h-3 w-full">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-sidebar-border" />
        {typeof barrierDropTimeMs === "number" &&
          barrierDropTimeMs > 0 &&
          barrierDropTimeMs <= round.durationMs && (
            <button
              type="button"
              title={`${formatReplayTime(barrierDropTimeMs)} — Barrier drop`}
              aria-label={`${formatReplayTime(barrierDropTimeMs)} — Barrier drop`}
              onClick={() => onSeek(barrierDropTimeMs)}
              className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white/70 transition-transform hover:scale-125"
              style={{
                left: `${Math.min(
                  100,
                  (barrierDropTimeMs / Math.max(1, round.durationMs)) * 100,
                )}%`,
              }}
            />
          )}
        {round.eventLog.map((event, index) => {
          const left = Math.max(
            0,
            Math.min(
              100,
              (event.timeSinceRoundStartMillis /
                Math.max(1, round.durationMs)) *
                100,
            ),
          );

          return (
            <button
              key={`${event.eventType}-${index}`}
              type="button"
              title={getMarkerLabel(event, players)}
              aria-label={getMarkerLabel(event, players)}
              onClick={() => onSeek(event.timeSinceRoundStartMillis)}
              className={cn(
                "absolute top-1/2 h-2.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-sm transition-transform hover:scale-125",
                getMarkerClassName(event, players),
              )}
              style={{ left: `${left}%` }}
            />
          );
        })}
      </div>

      <Slider
        value={[Math.min(currentTimeMs, round.durationMs)]}
        min={0}
        max={round.durationMs}
        step={100}
        onValueChange={([value]) => onSeek(value)}
        aria-label="Replay timeline"
      />
    </div>
  );
};
