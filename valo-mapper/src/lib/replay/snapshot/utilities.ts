import { mToPixels } from "@/lib/utils";
import { VISION_CONE_MAX_LENGTH } from "@/lib/vision-cone-utils";
import type { AbilityCanvas, MapSide } from "@/lib/types";
import {
  getReplayAbilityYawOffset,
  getReplayUtilityAbilityIcon,
} from "../display";
import type { ReplayFrame, ReplayMatch, ReplayRound } from "../types";
import {
  getReplayUtilityLengthAtTime,
  getReplayUtilityPathAtTime,
  getReplayUtilityPositionAtTime,
  getReplayUtilityVisionYawAtTime,
} from "../utilities";
import { REPLAY_PREFIX, REPLAY_VISION_CONE_NAME } from "./constants";
import {
  isReplayPointOnMap,
  toReplayCanvasPoint,
  toReplayCanvasRotation,
} from "./geometry";

export const buildReplayUtilities = ({
  match,
  round,
  frame,
  mapSide,
  showUtilities,
  showVisionCones,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
  showUtilities: boolean;
  showVisionCones: boolean;
}): AbilityCanvas[] => {
  if (!showUtilities) {
    return [];
  }

  return (round.utilities ?? []).flatMap((utility) => {
    const position = getReplayUtilityPositionAtTime(utility, frame.timeMs);
    if (!position) {
      return [];
    }

    const point = toReplayCanvasPoint({
      mapId: match.mapId,
      mapSide,
      position,
    });
    if (!point || !isReplayPointOnMap({ point })) {
      return [];
    }

    const abilityIcon = getReplayUtilityAbilityIcon(utility.abilityId);
    if (!abilityIcon) {
      return [];
    }

    const owner = utility.ownerPuuid
      ? match.players.find((player) => player.puuid === utility.ownerPuuid)
      : undefined;
    const isAlly = owner?.teamId === "Blue";
    const currentPath = getReplayUtilityPathAtTime(utility, frame.timeMs)
      .map((sample) =>
        toReplayCanvasPoint({
          mapId: match.mapId,
          mapSide,
          position: sample,
        }),
      )
      .filter((sample): sample is { x: number; y: number } => sample !== null)
      .map((sample) => ({
        x: sample.x - point.x,
        y: sample.y - point.y,
      }));
    const length = getReplayUtilityLengthAtTime(utility, frame.timeMs);
    const yawOffset = getReplayAbilityYawOffset(abilityIcon.lobbyAction);
    const rotation =
      yawOffset !== null &&
      typeof utility.yaw === "number" &&
      Number.isFinite(utility.yaw)
        ? toReplayCanvasRotation({
            mapId: match.mapId,
            mapSide,
            location: utility.position,
            viewRadians: (utility.yaw * Math.PI) / 180,
          }) + yawOffset
        : undefined;

    const id = `${REPLAY_PREFIX}ability-${round.roundNumber}-${utility.id}`;
    const abilities: AbilityCanvas[] = [
      {
        id,
        name: abilityIcon.name,
        action: abilityIcon.lobbyAction,
        isAlly,
        x: point.x,
        y: point.y,
        currentRotation: rotation,
        currentPath: currentPath.length > 1 ? currentPath : undefined,
        currentLength:
          length !== undefined
            ? mToPixels(length + (utility.abilityId === "trapwire" ? 2 : 0))
            : undefined,
        iconOnly: utility.iconOnly || undefined,
      },
    ];

    const visionYaw =
      showVisionCones && utility.abilityId === "spycam"
        ? getReplayUtilityVisionYawAtTime(utility.vision, frame.timeMs)
        : null;
    if (visionYaw !== null) {
      abilities.push({
        id: `${id}-vision`,
        name: REPLAY_VISION_CONE_NAME,
        action: "vision_cone_103",
        attachedToId: id,
        isAlly,
        x: point.x,
        y: point.y,
        currentRotation: toReplayCanvasRotation({
          mapId: match.mapId,
          mapSide,
          location: utility.position,
          viewRadians: (visionYaw * Math.PI) / 180,
        }),
        currentLength: VISION_CONE_MAX_LENGTH,
        iconOnly: false,
        showOuterCircle: true,
      });
    }

    return abilities;
  });
};
