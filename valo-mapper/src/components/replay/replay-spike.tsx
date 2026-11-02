"use client";

import { CanvasIcon } from "@/components/canvas-icons";
import { getToolIconAttachmentPosition } from "@/lib/tool-icon";
import type { IconSettings, MapSide, ToolIconCanvas } from "@/lib/types";
import type { ReplayFrame, ReplayMatch } from "@/lib/replay/types";
import {
  isReplayPointOnMap,
  toReplayCanvasPoint,
} from "@/lib/replay/snapshot";
import { TOOL_ICON_CONTOUR_COLOR, TOOL_ICON_CONTOUR_WIDTH } from "@/lib/consts";
import { Group } from "react-konva";

const REPLAY_SPIKE_SIZE = 32;

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
