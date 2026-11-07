"use client";

import { CanvasIcon } from "@/components/canvas-icons";
import { drawLifetimeRing } from "@/components/canvas-icons/lifetime-ring";
import { getToolIconAttachmentPosition } from "@/lib/tool-icon";
import type { IconSettings, MapSide, ToolIconCanvas } from "@/lib/types";
import type { ReplayFrame, ReplayMatch, ReplayRound } from "@/lib/replay/types";
import {
  isReplayPointOnMap,
  toReplayCanvasPoint,
} from "@/lib/replay/snapshot";
import { getReplaySpikeTimerProgress } from "@/lib/replay/spike";
import { TOOL_ICON_CONTOUR_COLOR, TOOL_ICON_CONTOUR_WIDTH } from "@/lib/consts";
import { Group, Shape } from "react-konva";

const REPLAY_SPIKE_SIZE = 32;
const REPLAY_SPIKE_RING_RADIUS = REPLAY_SPIKE_SIZE / 2 + 5;

const REPLAY_SPIKE_TOOL_ICON: ToolIconCanvas = {
  id: "replay-spike",
  x: 0,
  y: 0,
  name: "spike",
  width: REPLAY_SPIKE_SIZE,
  height: REPLAY_SPIKE_SIZE,
};

export const ReplaySpike = ({
  match,
  round,
  frame,
  mapSide,
  carrierPoint,
  agentsSettings,
  currentTimeMs,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
  carrierPoint: { x: number; y: number } | null;
  agentsSettings: IconSettings;
  currentTimeMs: number;
}) => {
  const isCarried = frame.spike?.state === "carried";
  const spikeTimerProgress = getReplaySpikeTimerProgress(
    round,
    currentTimeMs,
    frame.spike?.state === "planted",
  );
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

  if (!attachedPoint && !isReplayPointOnMap({ point })) {
    return null;
  }

  return (
    <Group opacity={frame.spike?.state === "defused" ? 0.45 : 1}>
      {spikeTimerProgress !== undefined && (
        <Shape
          x={point.x}
          y={point.y}
          listening={false}
          perfectDrawEnabled={false}
          sceneFunc={(context) => {
            drawLifetimeRing(context, {
              radius: REPLAY_SPIKE_RING_RADIUS,
              strokeWidth: 2.5,
              color: "#ffffff",
              outlineColor: "#000000",
              outlineWidth: 1.5,
              progress: spikeTimerProgress,
            });
          }}
        />
      )}
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
