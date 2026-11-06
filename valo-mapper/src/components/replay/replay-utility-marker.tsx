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
  getReplayUtilityLengthAtTime,
  getReplayUtilityPositionAtTime,
  getReplayUtilityPathAtTime,
  getReplayUtilityTrailAtTime,
  getReplayUtilityVisionYawAtTime,
} from "@/lib/replay/utilities";
import {
  getReplayAbilityYawOffset,
  getReplayLineAbilityGeometry,
  getReplayLineAbilityStyle,
  getReplayUtilityAbilityIcon,
} from "@/lib/replay/display";
import { mToPixels } from "@/lib/utils";
import { CIRCLE_ABILITY_CONFIGS } from "@/lib/consts";
import type { ReplayUtilityKind } from "@/lib/replay/types";

const REPLAY_INACTIVE_UTILITY_OPACITY = 0.3;
const NULLCMD_PULSE_MS = 1000;

const REPLAY_UTILITY_POLYGON_STYLES: Record<
  string,
  { fill: string; stroke: string }
> = {
  vipers_pit: { fill: "#48a85340", stroke: "#67e72a" },
  slow_orb: { fill: "#7dd3fc40", stroke: "#7dd3fc" },
};

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
  const initialPoint = toReplayCanvasPoint({
    mapId: match.mapId,
    mapSide,
    position: utility.position,
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
  const lineStyle = abilityIcon
    ? getReplayLineAbilityStyle(abilityIcon.action)
    : null;
  const isMovingWall =
    utility.abilityId === "contingency" && (utility.samples?.length ?? 0) > 1;
  const isMovingReckoning =
    (utility.abilityId === "reckoning" ||
      utility.abilityId === "nightfall" ||
      utility.abilityId === "rolling_thunder" ||
      utility.abilityId === "armageddon" ||
      utility.abilityId === "paranoia" ||
      utility.abilityId === "undercut") &&
    (utility.samples?.length ?? 0) > 1;
  const nullcmdPulseRadius = mToPixels(CIRCLE_ABILITY_CONFIGS.kayo_ult.radius);
  const nullcmdPulses =
    utility.abilityId === "nullcmd"
      ? (utility.samples ?? []).flatMap((sample) => {
          if (sample.timeMs <= utility.startTimeMs) {
            return [];
          }
          const age = currentTimeMs - sample.timeMs;
          if (age < 0 || age >= NULLCMD_PULSE_MS) {
            return [];
          }
          const pulsePoint = toReplayCanvasPoint({
            mapId: match.mapId,
            mapSide,
            position: sample,
          });
          if (!pulsePoint || !isReplayPointOnMap({ point: pulsePoint })) {
            return [];
          }
          return [
            {
              key: `${utility.id}-pulse-${sample.timeMs}`,
              point: pulsePoint,
              progress: age / NULLCMD_PULSE_MS,
            },
          ];
        })
      : [];
  const movementPath = isMovingWall
    ? (utility.samples ?? [])
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
  const movementPathStart = movementPath[0];
  const movementPathEnd = movementPath[movementPath.length - 1];
  const utilityLength = getReplayUtilityLengthAtTime(utility, currentTimeMs);
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
  const reckoningLineLength =
    lineStyle?.lineLength !== undefined ? mToPixels(lineStyle.lineLength) : 0;
  const reckoningStopFraction =
    utility.stopFraction !== undefined
      ? Math.min(1, Math.max(0, utility.stopFraction))
      : 1;
  const reckoningVisualLength = reckoningLineLength * reckoningStopFraction;
  const reckoningLineAngle = ((rotation ?? 0) * Math.PI) / 180;
  const reckoningLineStart =
    isMovingReckoning && initialPoint && reckoningVisualLength > 0
      ? initialPoint
      : null;
  const reckoningLineEnd =
    isMovingReckoning && initialPoint && reckoningVisualLength > 0
      ? {
          x:
            initialPoint.x +
            Math.cos(reckoningLineAngle) * reckoningVisualLength,
          y:
            initialPoint.y +
            Math.sin(reckoningLineAngle) * reckoningVisualLength,
        }
      : null;
  const reckoningSamples = utility.samples ?? [];
  const reckoningFirstSample = reckoningSamples[0];
  const reckoningLastSample = reckoningSamples[reckoningSamples.length - 1];
  const reckoningProgress =
    isMovingReckoning &&
    reckoningFirstSample &&
    reckoningLastSample &&
    reckoningLastSample.timeMs > reckoningFirstSample.timeMs
      ? Math.min(
          1,
          Math.max(
            0,
            (currentTimeMs - reckoningFirstSample.timeMs) /
              (reckoningLastSample.timeMs - reckoningFirstSample.timeMs),
          ),
        )
      : 0;
  const reckoningIconPoint =
    isMovingReckoning && initialPoint && reckoningVisualLength > 0
      ? {
          x:
            initialPoint.x +
            Math.cos(reckoningLineAngle) *
              reckoningVisualLength *
              reckoningProgress,
          y:
            initialPoint.y +
            Math.sin(reckoningLineAngle) *
              reckoningVisualLength *
              reckoningProgress,
        }
      : null;
  const iconPoint =
    isMovingReckoning && reckoningIconPoint
      ? reckoningIconPoint
      : !isMovingWall &&
          lineGeometry &&
          rotation !== undefined &&
          lineGeometry.iconGap > 0
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
  const polygonStyle = REPLAY_UTILITY_POLYGON_STYLES[utility.abilityId ?? ""];
  const polygons = (utility.polygons ?? []).flatMap((polygon) => {
    const converted = polygon
      .map((sample) =>
        toReplayCanvasPoint({
          mapId: match.mapId,
          mapSide,
          position: sample,
        }),
      )
      .filter((sample): sample is { x: number; y: number } => sample !== null);
    return converted.length >= 3 && converted.length === polygon.length
      ? [converted]
      : [];
  });
  const boundary = (utility.boundary ?? []).flatMap((segment) => {
    const converted = segment
      .map((sample) =>
        toReplayCanvasPoint({
          mapId: match.mapId,
          mapSide,
          position: sample,
        }),
      )
      .filter((sample): sample is { x: number; y: number } => sample !== null);
    return converted.length === 2 && converted.length === segment.length
      ? [converted]
      : [];
  });
  const usesPolygons = polygons.length > 0;

  return (
    <Group listening={false}>
      {usesPolygons &&
        polygons.map((points, index) => (
          <Line
            key={`${utility.id}-polygon-${index}`}
            points={points.flatMap((sample) => [sample.x, sample.y])}
            closed
            fill={
              polygonStyle?.fill ?? `${REPLAY_UTILITY_COLORS[utility.kind]}33`
            }
            stroke={
              polygonStyle?.fill ?? `${REPLAY_UTILITY_COLORS[utility.kind]}33`
            }
            strokeWidth={0.5}
            opacity={utility.inactive ? REPLAY_INACTIVE_UTILITY_OPACITY : 1}
            listening={false}
          />
        ))}
      {usesPolygons &&
        boundary.map((points, index) => (
          <Line
            key={`${utility.id}-boundary-${index}`}
            points={points.flatMap((sample) => [sample.x, sample.y])}
            stroke={polygonStyle?.stroke ?? REPLAY_UTILITY_COLORS[utility.kind]}
            strokeWidth={2}
            lineCap="round"
            opacity={utility.inactive ? REPLAY_INACTIVE_UTILITY_OPACITY : 1}
            listening={false}
          />
        ))}
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
      {isMovingWall &&
        movementPath.length > 1 &&
        lineStyle &&
        movementPathStart &&
        movementPathEnd && (
          <Line
            points={[
              movementPathStart.x,
              movementPathStart.y,
              movementPathEnd.x,
              movementPathEnd.y,
            ]}
            stroke={lineStyle.stroke}
            strokeWidth={
              lineStyle.strokeWidth
                ? mToPixels(lineStyle.strokeWidth)
                : undefined
            }
            opacity={utility.inactive ? REPLAY_INACTIVE_UTILITY_OPACITY : 1}
            lineCap="round"
            listening={false}
          />
        )}
      {isMovingReckoning &&
        lineStyle &&
        reckoningLineStart &&
        reckoningLineEnd && (
          <Line
            points={[
              reckoningLineStart.x,
              reckoningLineStart.y,
              reckoningLineEnd.x,
              reckoningLineEnd.y,
            ]}
            stroke={lineStyle.stroke}
            strokeWidth={
              lineStyle.strokeWidth
                ? mToPixels(lineStyle.strokeWidth)
                : undefined
            }
            opacity={utility.inactive ? REPLAY_INACTIVE_UTILITY_OPACITY : 1}
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
            utilityLength !== undefined
              ? mToPixels(
                  utilityLength + (utility.abilityId === "trapwire" ? 2 : 0),
                )
              : lineGeometry?.currentLength
          }
          currentPath={currentPath}
          pathTension={currentPath.length > 1 ? 0.4 : undefined}
          iconOnly={
            utility.iconOnly ||
            isMovingWall ||
            isMovingReckoning ||
            usesPolygons
          }
          abilityShapeOpacity={
            utility.inactive ? REPLAY_INACTIVE_UTILITY_OPACITY : 1
          }
          showHandle={
            abilityIcon.action !== "phoenix_wall" &&
            abilityIcon.action !== "harbor_wall"
          }
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
      {nullcmdPulses.map((pulse) => (
        <Circle
          key={pulse.key}
          name="nullcmd-pulse"
          x={pulse.point.x}
          y={pulse.point.y}
          radius={nullcmdPulseRadius * pulse.progress}
          stroke={CIRCLE_ABILITY_CONFIGS.kayo_ult.colors.stroke}
          strokeWidth={Math.max(2, 6 * (1 - pulse.progress))}
          opacity={1 - pulse.progress}
          listening={false}
        />
      ))}
    </Group>
  );
};
