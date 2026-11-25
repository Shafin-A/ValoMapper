import { getToolIconAttachmentPosition } from "@/lib/tool-icon";
import type { IconSettings, MapSide, ToolIconCanvas } from "@/lib/types";
import { getReplayWeaponIcon } from "../display";
import type { ReplayFrame, ReplayMatch, ReplayRound } from "../types";
import { REPLAY_PREFIX } from "./constants";
import { isReplayPointOnMap, toReplayCanvasPoint } from "./geometry";
import { getReplayAgentId, getReplayPlayerState } from "./players";

export const buildReplayWeapons = ({
  match,
  round,
  frame,
  mapSide,
  agentsSettings,
  hideAgentWeapons,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
  agentsSettings: IconSettings;
  hideAgentWeapons: boolean;
}): ToolIconCanvas[] => {
  if (hideAgentWeapons) {
    return [];
  }

  return match.players.flatMap((player, index) => {
    const framePlayer = getReplayPlayerState(round, frame, player.puuid);
    if (!framePlayer?.alive) {
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

    const weapon = getReplayWeaponIcon(framePlayer.weaponId);
    if (!weapon) {
      return [];
    }

    const toolIcon: ToolIconCanvas = {
      id: `${REPLAY_PREFIX}weapon-${index}`,
      x: point.x,
      y: point.y,
      ...weapon,
      attachedToId: getReplayAgentId(index),
    };
    const position = getToolIconAttachmentPosition(
      toolIcon,
      point.x,
      point.y,
      agentsSettings,
    );

    return [{ ...toolIcon, ...position }];
  });
};
