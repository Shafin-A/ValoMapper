"use client";

import { useReplayClockTime } from "@/hooks/use-replay-clock";
import type { ReplayClock } from "@/lib/replay/clock";
import { getReplayFrameAtTime } from "@/lib/replay/frames";
import type { ReplayMatch, ReplayRound } from "@/lib/replay/types";
import type { MapSide } from "@/lib/types";
import { useMemo } from "react";
import { ReplayCanvasLayer } from "./replay-canvas-layer";

export const ReplayCanvasOverlay = ({
  clock,
  match,
  round,
  mapSide = "defense",
  hideDeadAgents = false,
  hideAgentWeapons = false,
  hideWeaponHits = false,
  showVisionCones = true,
  showUtilities = true,
}: {
  clock: ReplayClock;
  match: ReplayMatch;
  round: ReplayRound;
  mapSide?: MapSide;
  hideDeadAgents?: boolean;
  hideAgentWeapons?: boolean;
  hideWeaponHits?: boolean;
  showVisionCones?: boolean;
  showUtilities?: boolean;
}) => {
  const currentTimeMs = useReplayClockTime(clock);
  const frame = useMemo(
    () => getReplayFrameAtTime(round, currentTimeMs),
    [currentTimeMs, round],
  );

  return (
    <ReplayCanvasLayer
      match={match}
      round={round}
      frame={frame}
      currentTimeMs={currentTimeMs}
      mapSide={mapSide}
      hideDeadAgents={hideDeadAgents}
      hideAgentWeapons={hideAgentWeapons}
      hideWeaponHits={hideWeaponHits}
      showVisionCones={showVisionCones}
      showUtilities={showUtilities}
    />
  );
};
