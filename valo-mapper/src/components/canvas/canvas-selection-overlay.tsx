import {
  useCanvasAbilities,
  useCanvasActions,
  useCanvasAgents,
  useCanvasImages,
  useCanvasScale,
  useCanvasTexts,
  useCanvasToolIcons,
  useCanvasUi,
} from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import {
  type CanvasRect,
  getCanvasItemWorldRect,
} from "@/lib/canvas-selection";
import { canvasMarqueeStore } from "@/lib/canvas-marquee-store";
import { useCommitCount } from "@/lib/perf-beacon";
import type Konva from "konva";
import type { Stage } from "konva/lib/Stage";
import { Fragment, memo, useEffect, useState, useSyncExternalStore } from "react";
import { Group, Layer, Rect } from "react-konva";

interface CanvasSelectionOverlayProps {
  stageRef: React.RefObject<Stage | null>;
  outlineGroupRef: React.RefObject<Konva.Group | null>;
  scale: number;
}

export const CanvasSelectionOverlay = memo(function CanvasSelectionOverlay({
  stageRef,
  outlineGroupRef,
  scale,
}: CanvasSelectionOverlayProps) {
  useCommitCount("CanvasSelectionOverlay");

  const { agentsOnCanvas } = useCanvasAgents();
  const { abilitiesOnCanvas } = useCanvasAbilities();
  const { textsOnCanvas } = useCanvasTexts();
  const { imagesOnCanvas } = useCanvasImages();
  const { toolIconsOnCanvas } = useCanvasToolIcons();
  const { selectedCanvasItems } = useCanvasUi();
  const { currentStageScale } = useCanvasScale();
  const { getRegisteredNode } = useCanvasActions();
  const { agentsSettings, abilitiesSettings } = useSettings();

  const marqueeRect = useSyncExternalStore(
    canvasMarqueeStore.subscribe,
    canvasMarqueeStore.getSnapshot,
    canvasMarqueeStore.getServerSnapshot,
  );

  const [outlines, setOutlines] = useState<Record<string, CanvasRect>>({});

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || selectedCanvasItems.length === 0) {
      setOutlines({});
      return;
    }

    const nextOutlines: Record<string, CanvasRect> = {};

    selectedCanvasItems.forEach((selection) => {
      const rect = getCanvasItemWorldRect(
        stage,
        selection,
        {
          agentsOnCanvas,
          abilitiesOnCanvas,
          textsOnCanvas,
          imagesOnCanvas,
          toolIconsOnCanvas,
        },
        { agentsSettings, abilitiesSettings },
        getRegisteredNode,
      );

      if (rect) {
        nextOutlines[selection.id] = rect;
      }
    });

    setOutlines(nextOutlines);
  }, [
    abilitiesOnCanvas,
    abilitiesSettings,
    agentsOnCanvas,
    agentsSettings,
    getRegisteredNode,
    imagesOnCanvas,
    scale,
    selectedCanvasItems,
    stageRef,
    textsOnCanvas,
    toolIconsOnCanvas,
  ]);

  const effectiveScale = currentStageScale || scale || 1;
  const selectionColor = "#4d7c0f";
  const selectionHaloColor = "rgba(12, 10, 9, 0.55)";
  const selectionStrokeWidth = 2 / effectiveScale;
  const selectionHaloWidth = 4 / effectiveScale;
  const outlinePadding = 4 / effectiveScale;
  const outlineEntries = Object.entries(outlines);

  return (
    <Layer isListening={false}>
      <Group ref={outlineGroupRef}>
        {outlineEntries.map(([id, rect]) => (
          <Fragment key={id}>
            <Rect
              x={rect.x - outlinePadding}
              y={rect.y - outlinePadding}
              width={rect.width + outlinePadding * 2}
              height={rect.height + outlinePadding * 2}
              stroke={selectionHaloColor}
              strokeWidth={selectionHaloWidth}
              cornerRadius={4 / effectiveScale}
              listening={false}
            />
            <Rect
              x={rect.x - outlinePadding}
              y={rect.y - outlinePadding}
              width={rect.width + outlinePadding * 2}
              height={rect.height + outlinePadding * 2}
              stroke={selectionColor}
              strokeWidth={selectionStrokeWidth}
              fill="rgba(77, 124, 15, 0.12)"
              cornerRadius={4 / effectiveScale}
              listening={false}
            />
          </Fragment>
        ))}
      </Group>
      {marqueeRect && (
        <Fragment>
          <Rect
            x={marqueeRect.x}
            y={marqueeRect.y}
            width={marqueeRect.width}
            height={marqueeRect.height}
            stroke={selectionHaloColor}
            strokeWidth={selectionHaloWidth}
            cornerRadius={2 / effectiveScale}
            listening={false}
          />
          <Rect
            x={marqueeRect.x}
            y={marqueeRect.y}
            width={marqueeRect.width}
            height={marqueeRect.height}
            stroke={selectionColor}
            strokeWidth={1.5 / effectiveScale}
            fill="rgba(77, 124, 15, 0.18)"
            cornerRadius={2 / effectiveScale}
            listening={false}
          />
        </Fragment>
      )}
    </Layer>
  );
});
