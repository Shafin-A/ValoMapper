import { ContextMenuPopover } from "@/components/canvas/context-menu-popover";
import { useCanvas } from "@/contexts/canvas-context";
import { useKonva } from "@/hooks/use-konva";
import Konva from "konva";
import { Stage as KonvaStage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { useEffect, useRef, forwardRef } from "react";
import { Layer, Stage } from "react-konva";
import { CanvasAbilities } from "./canvas-abilities";
import { CanvasAgents } from "./canvas-agents";
import { CanvasTexts } from "./canvas-texts";
import { CanvasImages } from "./canvas-images";
import { CanvasMapBackground } from "./canvas-map-background";
import { CanvasDrawLines } from "./canvas-draw-lines";
import { DeleteZone } from "./delete-zone";
import { CanvasToolIcons } from "./canvas-tool-icons";

export interface MapStageHandle {
  stage: KonvaStage | null;
  handleDragMove: () => void;
}

interface MapStageProps {
  width: number;
  height: number;
  scale: number;
  mapPosition: Vector2d;
}

export const MapStage = forwardRef<MapStageHandle, MapStageProps>(
  ({ width, height, scale, mapPosition }, forwardedRef) => {
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
    } = useKonva(stageRef, scale);

    useEffect(() => {
      if (forwardedRef) {
        if (typeof forwardedRef === "function") {
          forwardedRef({ stage: stageRef.current, handleDragMove });
        } else {
          forwardedRef.current = { stage: stageRef.current, handleDragMove };
        }
      }
    }, [forwardedRef, handleDragMove]);

    useEffect(() => {
      const stage = stageRef.current;
      if (!stage) return;

      const container = stage.container();
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;

      const scaledWidth = width;
      const scaledHeight = height;

      const x = (containerWidth - scaledWidth) / 2;
      const y = (containerHeight - scaledHeight) / 2;

      stage.position({ x, y });
      stage.batchDraw();

      handleDragMove();
    }, [width, height, handleDragMove]);

    useEffect(() => {
      handleDragMove();

      const handleResize = () => {
        handleDragMove();
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, [handleDragMove]);

    useEffect(() => {
      handleDragMove();
    }, [scale, handleDragMove]);

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
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
        data-tour="map-canvas"
      >
        <Stage
          width={width / scale}
          height={height}
          scaleX={scale}
          scaleY={scale}
          ref={stageRef}
          onWheel={handleWheel}
          draggable={!isDrawMode}
          onDragMove={handleDragMove}
          onMouseMove={handleStageMouseMove}
          onMouseDown={handleStageClick}
          onTouchStart={handleStageClick}
          onTouchMove={handleStageMouseMove}
          onTouchEnd={handleMouseUp}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleStageMouseLeave}
          onContextMenu={handleContextMenu}
        >
          <Layer isListening={false}>
            <CanvasMapBackground
              mapPosition={mapPosition}
              stageRef={stageRef}
            />
          </Layer>
          <Layer isListening={!isDrawMode}>
            <CanvasAbilities deleteGroupRef={deleteGroupRef} />
            <CanvasAgents deleteGroupRef={deleteGroupRef} />
            <CanvasImages
              stageRef={stageRef}
              transformerRefs={transformerRefs}
              deleteGroupRef={deleteGroupRef}
            />
            <CanvasTexts
              stageRef={stageRef}
              transformerRefs={transformerRefs}
              deleteGroupRef={deleteGroupRef}
            />
            <CanvasToolIcons deleteGroupRef={deleteGroupRef} />
          </Layer>
          <Layer isListening={isDrawMode}>
            <CanvasDrawLines currentLineRef={currentLineRef} />
            <DeleteZone deleteGroupRef={deleteGroupRef} />
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
  }
);

MapStage.displayName = "MapStage";
