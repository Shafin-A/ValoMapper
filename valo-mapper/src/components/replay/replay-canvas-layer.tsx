"use client";

import { AbilityIcon, CanvasIcon } from "@/components/canvas-icons";
import { useSettings } from "@/contexts/settings-context";
import { getAgentImageSrc } from "@/lib/matches";
import type { MapSide } from "@/lib/types";
import { getReplayPlayerStateAtTime } from "@/lib/replay/frames";
import type { ReplayFrame, ReplayMatch, ReplayRound } from "@/lib/replay/types";
import {
  getReplayAgentId,
  isReplayPointOnMap,
  toReplayCanvasPoint,
  toReplayCanvasRotation,
} from "@/lib/replay/snapshot";
import { Group, Image as KonvaImage } from "react-konva";
import useImage from "use-image";

const REPLAY_SPIKE_SIZE = 32;

const ReplaySpike = ({
  match,
  frame,
  mapSide,
}: {
  match: ReplayMatch;
  frame: ReplayFrame;
  mapSide: MapSide;
}) => {
  const [spikeImage] = useImage("/tools/spike.webp");
  const point = frame.spike
    ? toReplayCanvasPoint({
        mapId: match.mapId,
        mapSide,
        position: frame.spike,
      })
    : null;

  if (!point || !spikeImage) {
    return null;
  }

  return (
    <KonvaImage
      image={spikeImage}
      x={point.x - REPLAY_SPIKE_SIZE / 2}
      y={point.y - REPLAY_SPIKE_SIZE / 2}
      width={REPLAY_SPIKE_SIZE}
      height={REPLAY_SPIKE_SIZE}
      listening={false}
      opacity={frame.spike?.state === "defused" ? 0.45 : 1}
    />
  );
};

export const ReplayCanvasLayer = ({
  match,
  round,
  frame,
  currentTimeMs,
  mapSide = "defense",
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame | null;
  currentTimeMs: number;
  mapSide?: MapSide;
}) => {
  const { agentsSettings, abilitiesSettings } = useSettings();

  if (!frame) {
    return null;
  }

  return (
    <Group listening={false}>
      {match.players.map((player, index) => {
        const framePlayer = frame.players.find(
          (candidate) => candidate.puuid === player.puuid,
        );
        if (!framePlayer) {
          return null;
        }

        // Position still comes from the interpolated frame. Liveness comes from
        // the round-scoped scan-back so a body's last pose cannot keep a vision
        // cone after death.
        const alive =
          getReplayPlayerStateAtTime(round, player.puuid, currentTimeMs)
            ?.alive ?? true;

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

        const isAlly = player.teamId === "Blue";
        const agentId = getReplayAgentId(index);
        const rotation = toReplayCanvasRotation({
          mapId: match.mapId,
          mapSide,
          location: { x: framePlayer.x, y: framePlayer.y },
          viewRadians: framePlayer.viewRadians,
        });

        return (
          <Group key={player.puuid}>
            {alive && (
              <AbilityIcon
                id={`${agentId}-overlay-cone`}
                action="vision_cone_103"
                mapPosition={{ x: 0, y: 0 }}
                isAlly={isAlly}
                x={point.x}
                y={point.y}
                rotation={rotation}
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
              />
            )}
            <CanvasIcon
              id={`${agentId}-overlay`}
              isAlly={isAlly}
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
          </Group>
        );
      })}

      <ReplaySpike match={match} frame={frame} mapSide={mapSide} />
    </Group>
  );
};
