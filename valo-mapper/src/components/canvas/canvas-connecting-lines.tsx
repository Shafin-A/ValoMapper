import React, { memo, useMemo } from "react";
import { Line } from "react-konva";
import {
  useCanvasAbilities,
  useCanvasAgents,
  useCanvasConnectingLines,
} from "@/contexts/canvas-context";
import { useCommitCount } from "@/lib/perf-beacon";
import { ConnectingLine } from "@/lib/types";
import { shouldSuppressCanvasItemTap } from "@/lib/canvas-long-press";

interface CanvasConnectingLinesProps {
  onLineClick?: (line: ConnectingLine) => void;
}

export const CanvasConnectingLines = memo(function CanvasConnectingLines({
  onLineClick,
}: CanvasConnectingLinesProps) {
  useCommitCount("CanvasConnectingLines");

  const { connectingLines } = useCanvasConnectingLines();
  const { agentsOnCanvas } = useCanvasAgents();
  const { abilitiesOnCanvas } = useCanvasAbilities();

  const itemsById = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    agentsOnCanvas.forEach((agent) =>
      map.set(agent.id, { x: agent.x, y: agent.y }),
    );
    abilitiesOnCanvas.forEach((ability) =>
      map.set(ability.id, { x: ability.x, y: ability.y }),
    );
    return map;
  }, [agentsOnCanvas, abilitiesOnCanvas]);

  return (
    <>
      {connectingLines?.map((line) => {
        const from = itemsById.get(line.fromId);
        const to = itemsById.get(line.toId);
        const isInteractive = line.isInteractive !== false;

        if (!from || !to) return null;

        return (
          <Line
            key={line.id}
            points={[from.x, from.y, to.x, to.y]}
            stroke={line.strokeColor}
            strokeWidth={line.strokeWidth}
            isListening={isInteractive}
            perfectDrawEnabled={false}
            onClick={
              isInteractive
                ? () => {
                    if (shouldSuppressCanvasItemTap()) return;
                    onLineClick?.(line);
                  }
                : undefined
            }
            onTap={
              isInteractive
                ? () => {
                    if (shouldSuppressCanvasItemTap()) return;
                    onLineClick?.(line);
                  }
                : undefined
            }
            hitStrokeWidth={isInteractive ? 20 : 0}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) {
                container.style.cursor = isInteractive ? "pointer" : "default";
              }
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) {
                container.style.cursor = "default";
              }
            }}
          />
        );
      })}
    </>
  );
});
