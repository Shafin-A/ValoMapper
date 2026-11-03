"use client";

import { AbilityIcon } from "@/components/canvas-icons";
import type { IconSettings, MapSide } from "@/lib/types";
import type { ReplayMatch, ReplayUtility } from "@/lib/replay/types";
import {
  getReplayMapPosition,
  isReplayPointOnMap,
  toReplayCanvasPoint,
  toReplayCanvasRotation,
} from "@/lib/replay/snapshot";
import { VISION_CONE_MAX_LENGTH } from "@/lib/vision-cone-utils";
import { Circle, Group, Line } from "react-konva";
import {
  getReplayUtilityPositionAtTime,
  getReplayUtilityPathAtTime,
  getReplayUtilityTrailAtTime,
  getReplayUtilityVisionYawAtTime,
} from "@/lib/replay/utilities";
import {
  getReplayAbilityYawOffset,
  getReplayLineAbilityGeometry,
  getReplayUtilityAbilityIcon,
} from "@/lib/replay/display";
import { mToPixels } from "@/lib/utils";
import type { ReplayUtilityKind } from "@/lib/replay/types";

const REPLAY_INACTIVE_UTILITY_OPACITY = 0.3;

const REPLAY_UTILITY_COLORS: Record<ReplayUtilityKind, string> = {
  smoke: "#67e8f9",
  wall: "#c4b5fd",
  molly: "#fb923c",
  trap: "#facc15",
  mobile: "#4ade80",
  area: "#f472b6",
  marker: "#a3a3a3",
};

export const ReplayUtilityMarker = ({
  match,
  utility,
  mapSide,
  currentTimeMs,
  abilitiesSettings,
  showVisionCones,
}: {
  match: ReplayMatch;
  utility: ReplayUtility;
  mapSide: MapSide;
  currentTimeMs: number;
  abilitiesSettings: IconSettings;
  showVisionCones: boolean;
}) => {
  const position = getReplayUtilityPositionAtTime(utility, currentTimeMs);
  if (!position) {
    return null;
  }
  const point = toReplayCanvasPoint({
    mapId: match.mapId,
    mapSide,
    position,
  });
  if (!point || !isReplayPointOnMap({ point })) {
    return null;
  }

  const abilityIcon = getReplayUtilityAbilityIcon(utility.abilityId);
  const visionYaw =
    showVisionCones && utility.abilityId === "spycam"
      ? getReplayUtilityVisionYawAtTime(utility.vision, currentTimeMs)
      : null;
  const visionRotation =
    visionYaw === null
      ? undefined
      : toReplayCanvasRotation({
          mapId: match.mapId,
          mapSide,
          location: utility.position,
          viewRadians: (visionYaw * Math.PI) / 180,
        });
  const path = getReplayUtilityPathAtTime(utility, currentTimeMs)
    .map((sample) => ({
      point: toReplayCanvasPoint({
        mapId: match.mapId,
        mapSide,
        position: sample,
      }),
    }))
    .filter(
      (sample): sample is { point: { x: number; y: number } } =>
        sample.point !== null,
    );
  const currentPath = path.map(({ point: pathPoint }) => ({
    x: pathPoint.x - point.x,
    y: pathPoint.y - point.y,
  }));
  const owner = utility.ownerPuuid
    ? match.players.find((player) => player.puuid === utility.ownerPuuid)
    : undefined;
  const color =
    utility.kind === "mobile" && owner?.teamId === "Blue"
      ? "#42EEC7"
      : utility.kind === "mobile" && owner?.teamId === "Red"
        ? "#FF4655"
        : REPLAY_UTILITY_COLORS[utility.kind];
  const lineGeometry = abilityIcon
    ? getReplayLineAbilityGeometry(abilityIcon.action)
    : null;
  const yawOffset = abilityIcon
    ? getReplayAbilityYawOffset(abilityIcon.action)
    : null;
  const rotation =
    yawOffset !== null &&
    currentPath.length === 0 &&
    typeof utility.yaw === "number" &&
    Number.isFinite(utility.yaw)
      ? toReplayCanvasRotation({
          mapId: match.mapId,
          mapSide,
          location: utility.position,
          viewRadians: (utility.yaw * Math.PI) / 180,
        }) + yawOffset
      : undefined;
  const iconPoint =
    lineGeometry && rotation !== undefined && lineGeometry.iconGap > 0
      ? {
          x:
            point.x -
            Math.cos((rotation * Math.PI) / 180) * lineGeometry.iconGap,
          y:
            point.y -
            Math.sin((rotation * Math.PI) / 180) * lineGeometry.iconGap,
        }
      : point;
  const trail =
    utility.kind === "mobile"
      ? getReplayUtilityTrailAtTime(utility, currentTimeMs)
          .map((sample) =>
            toReplayCanvasPoint({
              mapId: match.mapId,
              mapSide,
              position: sample,
            }),
          )
          .filter(
            (sample): sample is { x: number; y: number } =>
              !!sample && isReplayPointOnMap({ point: sample }),
          )
      : [];
  const trailPoints = trail.flatMap((sample) => [sample.x, sample.y]);

  return (
    <Group listening={false}>
      {visionRotation !== undefined && abilityIcon && (
        <AbilityIcon
          id={`${utility.id}-vision`}
          action="vision_cone_103"
          mapPosition={getReplayMapPosition()}
          x={point.x}
          y={point.y}
          rotation={visionRotation}
          currentLength={VISION_CONE_MAX_LENGTH}
          src={abilityIcon.src}
          width={abilitiesSettings.scale}
          height={abilitiesSettings.scale}
          borderOpacity={abilitiesSettings.borderOpacity}
          strokeWidth={abilitiesSettings.borderWidth}
          radius={abilitiesSettings.radius}
          allyColor={abilitiesSettings.allyColor}
          enemyColor={abilitiesSettings.enemyColor}
          isAlly={owner?.teamId === "Blue"}
          draggable={false}
          isListening={false}
          showOuterCircle
          showCenterIcon={false}
          showRotationHandle={false}
        />
      )}
      {trailPoints.length >= 4 && (
        <Line
          points={trailPoints}
          stroke={color}
          strokeWidth={3}
          opacity={0.75}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}
      {!abilityIcon && (
        <Circle
          x={point.x}
          y={point.y}
          radius={utility.kind === "mobile" ? 7 : 6}
          fill={color}
          stroke="#111827"
          strokeWidth={2}
          shadowColor={color}
          shadowBlur={5}
          listening={false}
        />
      )}
      {abilityIcon && (
        <AbilityIcon
          id={utility.id}
          isAlly={owner?.teamId === "Blue"}
          action={abilityIcon.action}
          mapPosition={getReplayMapPosition()}
          x={iconPoint.x}
          y={iconPoint.y}
          rotation={rotation}
          currentLength={
            utility.length !== undefined
              ? mToPixels(
                  utility.length + (utility.abilityId === "trapwire" ? 2 : 0),
                )
              : lineGeometry?.currentLength
          }
          currentPath={currentPath}
          iconOnly={utility.iconOnly}
          abilityShapeOpacity={
            utility.inactive ? REPLAY_INACTIVE_UTILITY_OPACITY : 1
          }
          showHandle={abilityIcon.action !== "phoenix_wall"}
          src={abilityIcon.src}
          width={abilitiesSettings.scale}
          height={abilitiesSettings.scale}
          borderOpacity={abilitiesSettings.borderOpacity}
          strokeWidth={abilitiesSettings.borderWidth}
          radius={abilitiesSettings.radius}
          allyColor={abilitiesSettings.allyColor}
          enemyColor={abilitiesSettings.enemyColor}
          draggable={false}
          isListening={false}
          showCenterIcon
          showRotationHandle={false}
        />
      )}
    </Group>
  );
};
