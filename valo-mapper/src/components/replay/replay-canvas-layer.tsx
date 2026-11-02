"use client";

import { AbilityIcon, CanvasIcon } from "@/components/canvas-icons";
import { useSettings } from "@/contexts/settings-context";
import { getAgentImageSrc } from "@/lib/matches";
import { TOOL_ICON_CONTOUR_COLOR, TOOL_ICON_CONTOUR_WIDTH } from "@/lib/consts";
import { getToolIconAttachmentPosition } from "@/lib/tool-icon";
import type { IconSettings, MapSide, ToolIconCanvas } from "@/lib/types";
import { getReplayPlayerStateAtTime } from "@/lib/replay/frames";
import { getReplayWeaponIcon } from "@/lib/replay/display";
import type {
  ReplayFrame,
  ReplayHit,
  ReplayMatch,
  ReplayRound,
} from "@/lib/replay/types";
import {
  getReplayAgentId,
  getReplayMapPosition,
  isReplayPointOnMap,
  toReplayCanvasPoint,
  toReplayCanvasRotation,
} from "@/lib/replay/snapshot";
import { mToPixels } from "@/lib/utils";
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
import type { ReplayUtility, ReplayUtilityKind } from "@/lib/replay/types";

const REPLAY_SPIKE_SIZE = 32;

const REPLAY_TRACER_TRAVEL_MS = 120;

const REPLAY_TRACER_TAIL_PX = 50;

const REPLAY_TRACER_COLORS = {
  Blue: "#42EEC7",
  Red: "#FF4655",
} as const;
const REPLAY_UTILITY_COLORS: Record<ReplayUtilityKind, string> = {
  smoke: "#67e8f9",
  wall: "#c4b5fd",
  molly: "#fb923c",
  trap: "#facc15",
  mobile: "#4ade80",
  area: "#f472b6",
  marker: "#a3a3a3",
};

const REPLAY_SPIKE_TOOL_ICON: ToolIconCanvas = {
  id: "replay-spike",
  x: 0,
  y: 0,
  name: "spike",
  width: REPLAY_SPIKE_SIZE,
  height: REPLAY_SPIKE_SIZE,
};

const ReplaySpike = ({
  match,
  frame,
  mapSide,
  carrierPoint,
  agentsSettings,
}: {
  match: ReplayMatch;
  frame: ReplayFrame;
  mapSide: MapSide;
  carrierPoint: { x: number; y: number } | null;
  agentsSettings: IconSettings;
}) => {
  const isCarried = frame.spike?.state === "carried";
  const attachedPoint =
    isCarried && carrierPoint
      ? getToolIconAttachmentPosition(
          REPLAY_SPIKE_TOOL_ICON,
          carrierPoint.x,
          carrierPoint.y,
          agentsSettings,
        )
      : null;
  const point =
    attachedPoint ??
    (frame.spike
      ? toReplayCanvasPoint({
          mapId: match.mapId,
          mapSide,
          position: frame.spike,
        })
      : null);

  if (!point) {
    return null;
  }

  // Off-map spikes are hidden rather than drawn past the minimap bounds, but a
  // carried spike is anchored to an agent that is already on the map.
  if (!attachedPoint && !isReplayPointOnMap({ point })) {
    return null;
  }

  return (
    <Group opacity={frame.spike?.state === "defused" ? 0.45 : 1}>
      <CanvasIcon
        id="replay-spike"
        isAlly
        x={point.x}
        y={point.y}
        src="/tools/spike.webp"
        width={REPLAY_SPIKE_SIZE}
        height={REPLAY_SPIKE_SIZE}
        borderOpacity={0}
        strokeWidth={0}
        contourColor={TOOL_ICON_CONTOUR_COLOR}
        contourWidth={TOOL_ICON_CONTOUR_WIDTH}
        radius={0}
        fill=""
        allyColor="#ffffff"
        enemyColor="#ffffff"
        draggable={false}
        isListening={false}
        hasShadow
      />
    </Group>
  );
};

const getReplayHitPoint = ({
  match,
  round,
  mapSide,
  puuid,
  timeMs,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  mapSide: MapSide;
  puuid: string;
  timeMs: number;
}) => {
  const player = getReplayPlayerStateAtTime(round, puuid, timeMs);
  if (!player) {
    return null;
  }

  const point = toReplayCanvasPoint({
    mapId: match.mapId,
    mapSide,
    position: { x: player.x, y: player.y },
  });
  if (!point || !isReplayPointOnMap({ point })) {
    return null;
  }
  return point;
};

const buildReplayTracer = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  progress: number,
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) {
    return null;
  }

  const ux = dx / distance;
  const uy = dy / distance;
  const head = distance * Math.min(1, Math.max(0, progress));
  const tail = Math.max(0, head - REPLAY_TRACER_TAIL_PX);

  return [
    start.x + ux * tail,
    start.y + uy * tail,
    start.x + ux * head,
    start.y + uy * head,
  ];
};

const isReplayHitActive = (hit: ReplayHit, currentTimeMs: number) =>
  currentTimeMs >= hit.timeMs - REPLAY_TRACER_TRAVEL_MS &&
  currentTimeMs <= hit.timeMs;

export const ReplayCanvasLayer = ({
  match,
  round,
  frame,
  currentTimeMs,
  mapSide = "defense",
  hideDeadAgents = false,
  hideAgentWeapons = false,
  hideWeaponHits = false,
  showVisionCones = true,
  showUtilities = true,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame | null;
  currentTimeMs: number;
  mapSide?: MapSide;
  hideDeadAgents?: boolean;
  hideAgentWeapons?: boolean;
  hideWeaponHits?: boolean;
  showVisionCones?: boolean;
  showUtilities?: boolean;
}) => {
  const { agentsSettings, abilitiesSettings } = useSettings();

  if (!frame) {
    return null;
  }

  const getPlayerState = (puuid: string) => {
    const current = frame.players.find((player) => player.puuid === puuid);
    if (current) {
      return current;
    }

    const latest = getReplayPlayerStateAtTime(round, puuid, currentTimeMs);
    return latest && !latest.alive ? latest : null;
  };

  const playerPoints = new Map<string, { x: number; y: number }>();
  for (const player of match.players) {
    const framePlayer = getPlayerState(player.puuid);
    if (!framePlayer) continue;

    const point = toReplayCanvasPoint({
      mapId: match.mapId,
      mapSide,
      position: { x: framePlayer.x, y: framePlayer.y },
    });
    if (!point || !isReplayPointOnMap({ point })) continue;

    playerPoints.set(player.puuid, point);
  }

  const spike = frame.spike;
  const carrierPoint =
    spike?.state === "carried" && spike.carrierPuuid
      ? (playerPoints.get(spike.carrierPuuid) ?? null)
      : null;

  return (
    <Group listening={false}>
      {showVisionCones &&
        match.players.map((player, index) => {
          const framePlayer = getPlayerState(player.puuid);
          if (!framePlayer) {
            return null;
          }

          // Position still comes from the interpolated frame. Liveness comes from
          // the round-scoped scan-back so a body's last pose cannot keep a vision
          // cone after death.
          const alive =
            getReplayPlayerStateAtTime(round, player.puuid, currentTimeMs)
              ?.alive ?? true;
          if (!alive) {
            return null;
          }

          const point = toReplayCanvasPoint({
            mapId: match.mapId,
            mapSide,
            position: { x: framePlayer.x, y: framePlayer.y },
          });
          if (!point) {
            return null;
          }

          // Off-map actors are hidden rather than drawn past the minimap bounds.
          if (!isReplayPointOnMap({ point })) {
            return null;
          }

          const agentId = getReplayAgentId(index);

          return (
            <AbilityIcon
              key={`${agentId}-overlay-cone`}
              id={`${agentId}-overlay-cone`}
              action="vision_cone_103"
              mapPosition={getReplayMapPosition()}
              isAlly={player.teamId === "Blue"}
              x={point.x}
              y={point.y}
              rotation={toReplayCanvasRotation({
                mapId: match.mapId,
                mapSide,
                location: { x: framePlayer.x, y: framePlayer.y },
                viewRadians: framePlayer.viewRadians,
              })}
              src={getAgentImageSrc(player.characterName)}
              width={abilitiesSettings.scale}
              height={abilitiesSettings.scale}
              borderOpacity={abilitiesSettings.borderOpacity}
              strokeWidth={abilitiesSettings.borderWidth}
              radius={abilitiesSettings.radius}
              allyColor={abilitiesSettings.allyColor}
              enemyColor={abilitiesSettings.enemyColor}
              draggable={false}
              isListening={false}
              iconOnly={false}
              showOuterCircle
              showCenterIcon={false}
              showRotationHandle={false}
              currentLength={VISION_CONE_MAX_LENGTH}
            />
          );
        })}

      {showUtilities &&
        (round.utilities ?? []).map((utility) => (
          <ReplayUtilityMarker
            key={utility.id}
            match={match}
            utility={utility}
            mapSide={mapSide}
            currentTimeMs={currentTimeMs}
            abilitiesSettings={abilitiesSettings}
            showVisionCones={showVisionCones}
          />
        ))}

      {!hideWeaponHits &&
        (round.hits ?? []).map((hit, index) => {
          if (!isReplayHitActive(hit, currentTimeMs)) {
            return null;
          }

          const start = getReplayHitPoint({
            match,
            round,
            mapSide,
            puuid: hit.shooterPuuid,
            timeMs: hit.timeMs,
          });
          const end = getReplayHitPoint({
            match,
            round,
            mapSide,
            puuid: hit.victimPuuid,
            timeMs: hit.timeMs,
          });
          if (!start || !end) {
            return null;
          }

          const progress =
            (currentTimeMs - (hit.timeMs - REPLAY_TRACER_TRAVEL_MS)) /
            REPLAY_TRACER_TRAVEL_MS;
          const points = buildReplayTracer(start, end, progress);
          if (!points) {
            return null;
          }

          const shooter = match.players.find(
            (player) => player.puuid === hit.shooterPuuid,
          );
          const tracerColor =
            shooter?.teamId === "Blue"
              ? REPLAY_TRACER_COLORS.Blue
              : REPLAY_TRACER_COLORS.Red;

          return (
            <Line
              key={`replay-tracer-${index}-${hit.timeMs}`}
              id={`replay-tracer-${index}`}
              points={points}
              stroke={tracerColor}
              strokeWidth={2.5}
              opacity={0.9}
              lineCap="round"
              shadowColor={tracerColor}
              shadowBlur={8}
              shadowOpacity={0.7}
              listening={false}
            />
          );
        })}

      {match.players.map((player, index) => {
        const alive =
          getReplayPlayerStateAtTime(round, player.puuid, currentTimeMs)
            ?.alive ?? true;
        if (hideDeadAgents && !alive) {
          return null;
        }

        const point = playerPoints.get(player.puuid);
        if (!point) {
          return null;
        }

        const agentId = getReplayAgentId(index);

        return (
          <CanvasIcon
            key={`${agentId}-overlay`}
            id={`${agentId}-overlay`}
            isAlly={player.teamId === "Blue"}
            x={point.x}
            y={point.y}
            src={getAgentImageSrc(player.characterName)}
            width={agentsSettings.scale}
            height={agentsSettings.scale}
            borderOpacity={agentsSettings.borderOpacity}
            strokeWidth={agentsSettings.borderWidth}
            radius={agentsSettings.radius}
            allyColor={agentsSettings.allyColor}
            enemyColor={agentsSettings.enemyColor}
            draggable={false}
            isListening={false}
            isGray={!alive}
          />
        );
      })}

      {!hideAgentWeapons &&
        match.players.map((player, index) => {
          const alive =
            getReplayPlayerStateAtTime(round, player.puuid, currentTimeMs)
              ?.alive ?? true;
          if (!alive) {
            return null;
          }

          const point = playerPoints.get(player.puuid);
          const weapon = getReplayWeaponIcon(
            getPlayerState(player.puuid)?.weaponId,
          );
          if (!point || !weapon) {
            return null;
          }

          const toolIcon: ToolIconCanvas = {
            id: `replay-weapon-${index}`,
            x: point.x,
            y: point.y,
            ...weapon,
          };
          const position = getToolIconAttachmentPosition(
            toolIcon,
            point.x,
            point.y,
            agentsSettings,
          );

          return (
            <CanvasIcon
              key={toolIcon.id}
              id={toolIcon.id}
              isAlly={player.teamId === "Blue"}
              x={position.x}
              y={position.y}
              src={`/tools/${weapon.name}.webp`}
              width={weapon.width}
              height={weapon.height}
              borderOpacity={0}
              strokeWidth={0}
              contourColor={TOOL_ICON_CONTOUR_COLOR}
              contourWidth={TOOL_ICON_CONTOUR_WIDTH}
              radius={0}
              fill=""
              allyColor="#ffffff"
              enemyColor="#ffffff"
              draggable={false}
              isListening={false}
              hasShadow
            />
          );
        })}

      <ReplaySpike
        match={match}
        frame={frame}
        mapSide={mapSide}
        carrierPoint={carrierPoint}
        agentsSettings={agentsSettings}
      />
    </Group>
  );
};

const ReplayUtilityMarker = ({
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
