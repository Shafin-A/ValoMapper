"use client";

import { AbilityIcon, CanvasIcon } from "@/components/canvas-icons";
import { useSettings } from "@/contexts/settings-context";
import { getAgentImageSrc } from "@/lib/matches";
import { TOOL_ICON_CONTOUR_COLOR, TOOL_ICON_CONTOUR_WIDTH } from "@/lib/consts";
import { getToolIconAttachmentPosition } from "@/lib/tool-icon";
import type { MapSide, ToolIconCanvas } from "@/lib/types";
import { getReplayPlayerStateAtTime } from "@/lib/replay/frames";
import { getReplayWeaponIcon } from "@/lib/replay/display";
import type {
  ReplayFrame,
  ReplayFramePlayer,
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
import { VISION_CONE_MAX_LENGTH } from "@/lib/vision-cone-utils";
import { Group } from "react-konva";
import { ReplayHitTracer } from "./replay-hit-tracer";
import { ReplaySpike } from "./replay-spike";
import { ReplayUtilityMarker } from "./replay-utility-marker";

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

  const currentByPuuid = new Map<string, ReplayFramePlayer>();
  for (const player of frame.players) {
    currentByPuuid.set(player.puuid, player);
  }

  const latestByPuuid = new Map<string, ReplayFramePlayer | null>();
  for (const player of match.players) {
    latestByPuuid.set(
      player.puuid,
      currentByPuuid.get(player.puuid) ??
        getReplayPlayerStateAtTime(round, player.puuid, currentTimeMs),
    );
  }

  const isAlive = (puuid: string) =>
    latestByPuuid.get(puuid)?.alive ?? true;

  const getPlayerState = (puuid: string) => {
    const current = currentByPuuid.get(puuid);
    if (current) {
      return current;
    }

    const latest = latestByPuuid.get(puuid);
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
          const alive = isAlive(player.puuid);
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
        (round.hits ?? []).map((hit, index) => (
          <ReplayHitTracer
            key={`replay-tracer-${index}-${hit.timeMs}`}
            match={match}
            round={round}
            hit={hit}
            index={index}
            mapSide={mapSide}
            currentTimeMs={currentTimeMs}
          />
        ))}

      {match.players.map((player, index) => {
        const alive = isAlive(player.puuid);
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
          const alive = isAlive(player.puuid);
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
        round={round}
        frame={frame}
        mapSide={mapSide}
        carrierPoint={carrierPoint}
        agentsSettings={agentsSettings}
        currentTimeMs={currentTimeMs}
      />
    </Group>
  );
};
