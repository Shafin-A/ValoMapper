import { ContextMenuPopover } from "@/components/canvas/context-menu-popover";
import { RemoteCursors } from "@/components/collaboration";
import { useCanvas } from "@/contexts/canvas-context";
import { useWebSocket } from "@/contexts/websocket-context";
import Konva from "konva";
import { Stage as KonvaStage } from "konva/lib/Stage";
import { Vector2d } from "konva/lib/types";
import { useEffect, useRef, forwardRef, useState, useCallback } from "react";
import { Layer, Stage } from "react-konva";
import { CanvasAbilities } from "./canvas-abilities";
import { CanvasAgents } from "./canvas-agents";
import { CanvasCallouts } from "./canvas-callouts";
import { CanvasConnectingLines } from "./canvas-connecting-lines";
import { CanvasUltOrbs } from "./canvas-ult-orbs";
import { CanvasSpawnBarriers } from "./canvas-spawn-barriers";
import { CanvasTexts } from "./canvas-texts";
import { CanvasImages } from "./canvas-images";
import { CanvasMapBackground } from "./canvas-map-background";
import { CanvasDrawLines } from "./canvas-draw-lines";
import { DeleteZone } from "./delete-zone";
import { CanvasToolIcons } from "./canvas-tool-icons";
import { useCanvasEvents } from "@/hooks/canvas";
import {
  findAbilityDefinitionByAction,
  getAbilityVariants,
} from "@/lib/consts/configs/agent-icon/consts";
import { FullscreenImageModal } from "./fullscreen-image-modal";
import { LineupViewDialog } from "./lineup-view-dialog";
import { AbilityCanvas, ConnectingLine } from "@/lib/types";

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

    const { sendCursorPosition, status: wsStatus } = useWebSocket();

    const stageRef = useRef<KonvaStage | null>(null);
    const [fullscreenImageSrc, setFullscreenImageSrc] = useState<string | null>(
      null,
    );
    const [selectedConnectingLine, setSelectedConnectingLine] =
      useState<ConnectingLine | null>(null);

    const transformerRefs = useRef<Map<string, Konva.Transformer>>(new Map());

    const {
      handleWheel,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleStageClick,
      handleStagePointerUp,
      handleStageMouseLeave,
      handleStageMouseEnter,
      handleStageMouseMove,
      handleContextMenu,
      handleDelete,
      handleDuplicate,
      handleToggleAlly,
      handleSwapAbility,
      handlePopoverOpenChange,
      handleDragMove,
      contextMenu,
      currentLineRef,
      deleteGroupRef,
    } = useCanvasEvents(stageRef, scale);

    const handleMouseMoveWithCursor = useCallback(() => {
      handleStageMouseMove();

      if (wsStatus === "connected" && stageRef.current) {
        const pointer = stageRef.current.getPointerPosition();
        if (pointer) {
          const stagePos = stageRef.current.position();
          const stageScale = stageRef.current.scaleX();
          const x = (pointer.x - stagePos.x) / stageScale;
          const y = (pointer.y - stagePos.y) / stageScale;
          sendCursorPosition(x, y);
        }
      }
    }, [handleStageMouseMove, wsStatus, sendCursorPosition]);

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
        ? (agentsOnCanvas.find((a) => a.id === contextMenu.itemId) ?? null)
        : contextMenu.itemType === "ability"
          ? (abilitiesOnCanvas.find((a) => a.id === contextMenu.itemId) ?? null)
          : contextMenu.itemType === "text"
            ? (textsOnCanvas.find((t) => t.id === contextMenu.itemId) ?? null)
            : contextMenu.itemType === "image"
              ? (imagesOnCanvas.find((i) => i.id === contextMenu.itemId) ??
                null)
              : null
      : null;

    const canSwapAbility =
      contextMenu.open &&
      contextMenu.itemType === "ability" &&
      currentItem != null &&
      (() => {
        const def = findAbilityDefinitionByAction(
          (currentItem as AbilityCanvas).action,
        );
        return def ? getAbilityVariants(def).length > 1 : false;
      })();

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
          onMouseMove={handleMouseMoveWithCursor}
          onMouseEnter={handleStageMouseEnter}
          onMouseDown={handleStageClick}
          onTouchStart={(e) => {
            handleTouchStart(e);
            handleStageClick();
          }}
          onTouchMove={(e) => {
            handleTouchMove(e);
            handleStageMouseMove();
          }}
          onTouchEnd={(e) => {
            handleTouchEnd(e);
            handleStagePointerUp();
          }}
          onMouseUp={handleStagePointerUp}
          onMouseLeave={handleStageMouseLeave}
          onContextMenu={handleContextMenu}
        >
          <Layer isListening={false}>
            <CanvasMapBackground
              mapPosition={mapPosition}
              stageRef={stageRef}
            />
            <CanvasUltOrbs mapPosition={mapPosition} />
            <CanvasSpawnBarriers mapPosition={mapPosition} />
            <CanvasCallouts mapPosition={mapPosition} />
          </Layer>
          <Layer isListening={!isDrawMode}>
            <CanvasConnectingLines onLineClick={setSelectedConnectingLine} />
            <CanvasAbilities deleteGroupRef={deleteGroupRef} />
            <CanvasAgents deleteGroupRef={deleteGroupRef} />
            <CanvasImages
              stageRef={stageRef}
              transformerRefs={transformerRefs}
              deleteGroupRef={deleteGroupRef}
              onImageDoubleClick={setFullscreenImageSrc}
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
          <Layer isListening={false}>
            <RemoteCursors scale={scale} />
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
          onSwapAbility={canSwapAbility ? handleSwapAbility : undefined}
          onDelete={handleDelete}
        />

        <FullscreenImageModal
          imageSrc={fullscreenImageSrc}
          onClose={() => setFullscreenImageSrc(null)}
        />

        <LineupViewDialog
          line={selectedConnectingLine}
          isOpen={selectedConnectingLine !== null}
          onClose={() => setSelectedConnectingLine(null)}
        />
      </div>
    );
  },
);

MapStage.displayName = "MapStage";
