import { ContextMenuPopover } from "@/components/context-menu-popover";
import { useCanvas } from "@/contexts/canvas-context";
import { useKonva } from "@/hooks/use-konva";
import Konva from "konva";
import { Stage as KonvaStage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { useRef } from "react";
import { Layer, Stage } from "react-konva";
import { CanvasAbilities } from "./canvas-abilities";
import { CanvasAgents } from "./canvas-agents";
import { CanvasTexts } from "./canvas-texts";
import { CanvasImages } from "./canvas-images";
import { CanvasMapBackground } from "./canvas-map-background";
import { CanvasDrawLines } from "./canvas-draw-lines";
import { DeleteZone } from "./delete-zone";

interface MapStageProps {
  width: number;
  height: number;
  mapPosition: Vector2d;
}

export const MapStage = ({ width, height, mapPosition }: MapStageProps) => {
  const {
    agentsOnCanvas,
    abilitiesOnCanvas,
    isDrawMode,
    textsOnCanvas,
    imagesOnCanvas,
  } = useCanvas();

  const stageRef = useRef<KonvaStage | null>(null);

  const transformerRefs = useRef<Map<string, Konva.Transformer>>(new Map());

  const {
    handleWheel,
    handleStageClick,
    handleStageMouseLeave,
    handleStageMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleDelete,
    handleDuplicate,
    handleToggleAlly,
    handlePopoverOpenChange,
    handleDragMove,
    contextMenu,
    currentLineRef,
    deleteGroupRef,
  } = useKonva(stageRef);

  const currentItem = contextMenu.open
    ? contextMenu.itemType === "agent"
      ? agentsOnCanvas.find((a) => a.id === contextMenu.itemId) ?? null
      : contextMenu.itemType === "ability"
      ? abilitiesOnCanvas.find((a) => a.id === contextMenu.itemId) ?? null
      : contextMenu.itemType === "text"
      ? textsOnCanvas.find((t) => t.id === contextMenu.itemId) ?? null
      : contextMenu.itemType === "image"
      ? imagesOnCanvas.find((i) => i.id === contextMenu.itemId) ?? null
      : null
    : null;

  return (
    <div style={{ position: "relative" }}>
      <Stage
        width={width}
        height={height}
        ref={stageRef}
        onWheel={handleWheel}
        draggable={!isDrawMode}
        onDragMove={handleDragMove}
        onMouseMove={handleStageMouseMove}
        onMouseDown={handleStageClick}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleStageMouseLeave}
        onContextMenu={handleContextMenu}
      >
        <Layer isListening={false}>
          <CanvasMapBackground mapPosition={mapPosition} />
        </Layer>
        <Layer isListening={!isDrawMode}>
          <CanvasAbilities deleteGroupRef={deleteGroupRef} />
          <CanvasAgents deleteGroupRef={deleteGroupRef} />
          <CanvasImages
            stageRef={stageRef}
            transformerRefs={transformerRefs}
            deleteGroupRef={deleteGroupRef}
          />
          <CanvasTexts stageRef={stageRef} transformerRefs={transformerRefs} />
        </Layer>
        <Layer isListening={isDrawMode}>
          <CanvasDrawLines currentLineRef={currentLineRef} />
          <DeleteZone deleteGroupRef={deleteGroupRef} width={width} />
        </Layer>
      </Stage>

      <ContextMenuPopover
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        itemType={contextMenu.itemType}
        currentItem={currentItem}
        onOpenChange={handlePopoverOpenChange}
        onDuplicate={handleDuplicate}
        onToggleAlly={handleToggleAlly}
        onDelete={handleDelete}
      />
    </div>
  );
};
