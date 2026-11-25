import { getToolIconAttachmentPosition } from "@/lib/tool-icon";
import type { IconSettings, MapSide, ToolIconCanvas } from "@/lib/types";
import type { ReplayFrame, ReplayMatch, ReplayRound } from "../types";
import { REPLAY_PREFIX, REPLAY_SPIKE_SIZE } from "./constants";
import { isReplayPointOnMap, toReplayCanvasPoint } from "./geometry";
import {
  getReplayAgentId,
  getReplayPlayerState,
  getRoundPlanterPuuid,
} from "./players";

export const buildReplaySpike = ({
  match,
  round,
  frame,
  mapSide,
  agentsSettings,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
  agentsSettings: IconSettings;
}): ToolIconCanvas | null => {
  const spike = frame.spike;
  if (!spike) {
    return null;
  }

  const toolIcon: ToolIconCanvas = {
    id: `${REPLAY_PREFIX}spike-${round.roundNumber}`,
    name: "spike",
    x: 0,
    y: 0,
    width: REPLAY_SPIKE_SIZE,
    height: REPLAY_SPIKE_SIZE,
  };

  if (spike.state === "carried") {
    const carrierPuuid = spike.carrierPuuid ?? getRoundPlanterPuuid(round);
    const carrierIndex = carrierPuuid
      ? match.players.findIndex((player) => player.puuid === carrierPuuid)
      : -1;
    const carrier = carrierPuuid
      ? getReplayPlayerState(round, frame, carrierPuuid)
      : null;

    if (carrierIndex >= 0 && carrier?.alive) {
      const carrierPoint = toReplayCanvasPoint({
        mapId: match.mapId,
        mapSide,
        position: { x: carrier.x, y: carrier.y },
      });

      if (carrierPoint && isReplayPointOnMap({ point: carrierPoint })) {
        const position = getToolIconAttachmentPosition(
          toolIcon,
          carrierPoint.x,
          carrierPoint.y,
          agentsSettings,
        );

        return {
          ...toolIcon,
          ...position,
          attachedToId: getReplayAgentId(carrierIndex),
        };
      }
    }
  }

  const point = toReplayCanvasPoint({
    mapId: match.mapId,
    mapSide,
    position: spike,
  });

  if (!point) {
    return null;
  }

  // Keep the copied lobby consistent with the canvas: off-map spikes are
  // hidden rather than pasted outside the minimap.
  if (!isReplayPointOnMap({ point })) {
    return null;
  }

  return {
    ...toolIcon,
    x: point.x,
    y: point.y,
  };
};
