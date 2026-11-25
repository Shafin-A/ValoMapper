import { VISION_CONE_MAX_LENGTH } from "@/lib/vision-cone-utils";
import type { AbilityCanvas, AgentCanvas, MapSide } from "@/lib/types";
import type { ReplayFrame, ReplayMatch, ReplayRound } from "../types";
import { REPLAY_VISION_CONE_NAME } from "./constants";
import {
  isReplayPointOnMap,
  toReplayCanvasPoint,
  toReplayCanvasRotation,
} from "./geometry";
import {
  getReplayAgentId,
  getReplayAgentRole,
  getReplayPlayerState,
} from "./players";

export const buildReplayAgents = ({
  match,
  round,
  frame,
  mapSide,
  hideDeadAgents,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
  hideDeadAgents: boolean;
}): AgentCanvas[] => {
  return match.players.flatMap((player, index) => {
    const framePlayer = getReplayPlayerState(round, frame, player.puuid);
    if (!framePlayer || (hideDeadAgents && !framePlayer.alive)) {
      return [];
    }

    const point = toReplayCanvasPoint({
      mapId: match.mapId,
      mapSide,
      position: { x: framePlayer.x, y: framePlayer.y },
    });

    if (!point || !isReplayPointOnMap({ point })) {
      return [];
    }

    return [
      {
        id: getReplayAgentId(index),
        name: player.characterName,
        role: getReplayAgentRole(player.characterName),
        isAlly: player.teamId === "Blue",
        isGray: !framePlayer.alive,
        x: point.x,
        y: point.y,
      },
    ];
  });
};

export const buildReplayVisionCones = ({
  match,
  round,
  frame,
  mapSide,
  showVisionCones,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
  showVisionCones: boolean;
}): AbilityCanvas[] => {
  if (!showVisionCones) {
    return [];
  }

  return match.players.flatMap((player, index) => {
    const framePlayer = getReplayPlayerState(round, frame, player.puuid);
    if (!framePlayer || !framePlayer.alive) {
      return [];
    }

    const point = toReplayCanvasPoint({
      mapId: match.mapId,
      mapSide,
      position: { x: framePlayer.x, y: framePlayer.y },
    });

    if (!point || !isReplayPointOnMap({ point })) {
      return [];
    }

    const agentId = getReplayAgentId(index);

    return [
      {
        id: `${agentId}-cone`,
        name: REPLAY_VISION_CONE_NAME,
        action: "vision_cone_103",
        attachedToId: agentId,
        isAlly: player.teamId === "Blue",
        x: point.x,
        y: point.y,
        currentRotation: toReplayCanvasRotation({
          mapId: match.mapId,
          mapSide,
          location: { x: framePlayer.x, y: framePlayer.y },
          viewRadians: framePlayer.viewRadians,
        }),
        currentLength: VISION_CONE_MAX_LENGTH,
        iconOnly: false,
        showOuterCircle: true,
      },
    ];
  });
};
