import { ContextMenuPopover } from "@/components/canvas/context-menu-popover";
import "@/lib/konva-config";
import { RemoteCursors } from "@/components/collaboration";
import {
  useCanvasActions,
  useCanvasEntities,
  useCanvasUi,
  useCanvasView,
} from "@/contexts/canvas-context";
import { useCommitCount } from "@/lib/perf-beacon";
import { useSendCursorPosition } from "@/contexts/websocket-context";
import Konva from "konva";
import { Stage as KonvaStage } from "konva/lib/Stage";
import type { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import {
  useEffect,
  useRef,
  forwardRef,
  useState,
  useCallback,
  memo,
  type ReactNode,
} from "react";
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
import { CanvasNotePreview } from "./canvas-note-preview";
import { NoteEditorDialog } from "./note-editor-dialog";
import { CanvasSelectionOverlay } from "./canvas-selection-overlay";
import { DeleteZone } from "./delete-zone";
import { CanvasToolIcons } from "./canvas-tool-icons";
import { useCanvasEvents } from "@/hooks/canvas";
import { FullscreenImageModal } from "./fullscreen-image-modal";
import { LineupViewDialog } from "./lineup-view-dialog";
import { ConnectingLine } from "@/lib/types";
import { MobileTextEditorHost } from "./mobile-text-editor-host";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Scan } from "lucide-react";

export interface MapStageHandle {
  stage: KonvaStage | null;
  handleDragMove: () => void;
}

interface MapStageProps {
  width: number;
  height: number;
  scale: number;
  mapPosition: Vector2d;
  /**
   * Read-only entities rendered underneath user drawings. Used by the replay
   * player so playback never mutates the canvas history.
   */
  replayOverlay?: ReactNode;
  /** Disable marquee multi-select on read-only canvases such as replay. */
  enableMultiSelect?: boolean;
}

type CanvasContextMenuData = ReturnType<typeof useCanvasEvents>["contextMenu"];

interface CanvasContextMenuProps {
  contextMenu: CanvasContextMenuData;
  onOpenChange: (open: boolean) => void;
  onDuplicate: () => void;
  onEditNote?: () => void;
  onToggleAlly?: () => void;
  onToggleAgentDead?: () => void;
  onSwapAbility?: () => void;
  onToggleAbilityIconOnly?: () => void;
  onToggleAbilityOuterCircle?: () => void;
  onRemoveAttachedVisionCone?: () => void;
  onDetachVisionCone?: () => void;
  onDelete: () => void;
}

const CanvasContextMenu = memo(function CanvasContextMenu({
  contextMenu,
  onOpenChange,
  onDuplicate,
  onEditNote,
  onToggleAlly,
  onToggleAgentDead,
  onSwapAbility,
  onToggleAbilityIconOnly,
  onToggleAbilityOuterCircle,
  onRemoveAttachedVisionCone,
  onDetachVisionCone,
  onDelete,
}: CanvasContextMenuProps) {
  const {
    agentsOnCanvas,
    abilitiesOnCanvas,
    textsOnCanvas,
    imagesOnCanvas,
    toolIconsOnCanvas,
  } = useCanvasEntities();

  const currentItem = contextMenu.open
    ? contextMenu.anchorType === "agent"
      ? (agentsOnCanvas.find((a) => a.id === contextMenu.anchorId) ?? null)
      : contextMenu.anchorType === "ability"
        ? (abilitiesOnCanvas.find((a) => a.id === contextMenu.anchorId) ?? null)
        : contextMenu.anchorType === "text"
          ? (textsOnCanvas.find((t) => t.id === contextMenu.anchorId) ?? null)
          : contextMenu.anchorType === "image"
            ? (imagesOnCanvas.find((i) => i.id === contextMenu.anchorId) ?? null)
            : (toolIconsOnCanvas.find(
                (toolIcon) => toolIcon.id === contextMenu.anchorId,
              ) ?? null)
    : null;

  return (
    <ContextMenuPopover
      open={contextMenu.open}
      x={contextMenu.x}
      y={contextMenu.y}
      itemType={contextMenu.anchorType}
      selectedCount={contextMenu.targetItems.length}
      currentItem={currentItem}
      onOpenChange={onOpenChange}
      onDuplicate={onDuplicate}
      onEditNote={onEditNote}
      onToggleAlly={onToggleAlly}
      onToggleAgentDead={onToggleAgentDead}
      onSwapAbility={onSwapAbility}
      onToggleAbilityIconOnly={onToggleAbilityIconOnly}
      onToggleAbilityOuterCircle={onToggleAbilityOuterCircle}
      onRemoveAttachedVisionCone={onRemoveAttachedVisionCone}
      onDetachVisionCone={onDetachVisionCone}
      onDelete={onDelete}
    />
  );
});

export const MapStage = memo(
  forwardRef<MapStageHandle, MapStageProps>(
    (
      {
        width,
        height,
        scale,
        mapPosition,
        replayOverlay,
        enableMultiSelect = true,
      },
      forwardedRef,
    ) => {
    useCommitCount("MapStage");

    const isMobile = useIsMobile();
    const { isDrawMode, setIsDraggingCanvasItem } = useCanvasUi();
    const { setCurrentStageScale } = useCanvasActions();
    const { canvasBackground } = useCanvasView();

    const sendCursorPosition = useSendCursorPosition();

    const stageRef = useRef<KonvaStage | null>(null);
    const [fullscreenImageSrc, setFullscreenImageSrc] = useState<string | null>(
      null,
    );
    const [selectedConnectingLine, setSelectedConnectingLine] =
      useState<ConnectingLine | null>(null);

    const transformerRefs = useRef<Map<string, Konva.Transformer>>(new Map());
    const selectionOutlineGroupRef = useRef<Konva.Group | null>(null);

    const {
      handleWheel,
      handleZoomIn,
      handleZoomOut,
      handleResetZoom,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleTouchCancel,
      handleStageMouseDown,
      handleStagePointerUp,
      handleStageMouseLeave,
      handleStageMouseEnter,
      handleStageMouseMove,
      handleContextMenu,
      handleDelete,
      handleEditNote,
      handleDuplicate,
      handleToggleAlly,
      handleToggleAgentDead,
      handleSwapAbility,
      handleToggleAbilityIconOnly,
      handleToggleAbilityOuterCircle,
      handleRemoveAttachedVisionCone,
      handleDetachVisionCone,
      handlePopoverOpenChange,
      handleDragMove,
      contextMenu,
      selectionDrag,
      currentLineRef,
      deleteGroupRef,
    } = useCanvasEvents(
      stageRef,
      scale,
      enableMultiSelect,
      selectionOutlineGroupRef,
    );

    const handleMouseMoveWithCursor = useCallback(() => {
      handleStageMouseMove();

      if (stageRef.current) {
        const pointer = stageRef.current.getPointerPosition();
        if (pointer) {
          const stagePos = stageRef.current.position();
          const stageScale = stageRef.current.scaleX();
          const x = (pointer.x - stagePos.x) / stageScale;
          const y = (pointer.y - stagePos.y) / stageScale;
          sendCursorPosition(x, y);
        }
      }
    }, [handleStageMouseMove, sendCursorPosition]);

    const handleItemDragStart = useCallback(
      (event: KonvaEventObject<DragEvent>) => {
        const stage = event.target.getStage();
        if (stage && event.target !== stage) {
          setIsDraggingCanvasItem(true);
        }
      },
      [setIsDraggingCanvasItem],
    );

    const handleItemDragEnd = useCallback(
      (event: KonvaEventObject<DragEvent>) => {
        const stage = event.target.getStage();
        if (stage && event.target !== stage) {
          setIsDraggingCanvasItem(false);
        }
      },
      [setIsDraggingCanvasItem],
    );

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
      const host = container.parentElement as HTMLElement | null;
      const containerWidth = host?.offsetWidth ?? container.offsetWidth;
      const containerHeight = host?.offsetHeight ?? container.offsetHeight;

      const scaledWidth = stage.width() * stage.scaleX();
      const scaledHeight = stage.height() * stage.scaleY();

      const x = (containerWidth - scaledWidth) / 2;
      const y = (containerHeight - scaledHeight) / 2;

      stage.position({ x, y });
      stage.batchDraw();

      handleDragMove();
    }, [width, height, scale, handleDragMove]);

    useEffect(() => {
      const stage = stageRef.current;
      if (!stage) return;

      // Sync the UI scale for every zoom path, not just the wrapped handlers.
      const syncStageScale = () => {
        setCurrentStageScale(stage.scaleX());
      };

      syncStageScale();
      stage.on("scaleXChange.canvasScaleSync", syncStageScale);
      stage.on("scaleYChange.canvasScaleSync", syncStageScale);

      return () => {
        stage.off("scaleXChange.canvasScaleSync", syncStageScale);
        stage.off("scaleYChange.canvasScaleSync", syncStageScale);
      };
    }, [setCurrentStageScale]);

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

    const canSwapAbility =
      contextMenu.open && contextMenu.capabilities.canSwapAbility;

    const canRemoveAttachedVisionCone =
      contextMenu.open && contextMenu.capabilities.canRemoveAttachedVisionCone;

    const canvasBackgroundClassName =
      canvasBackground === "dots"
        ? "lobby-canvas-background-dots"
        : canvasBackground === "grid"
          ? "lobby-canvas-background-grid"
          : undefined;

    return (
      <div
        role="region"
        aria-label="Tactical map canvas"
        className={canvasBackgroundClassName}
        onPointerDown={() => {
          requestAnimationFrame(() => {
            const activeElement = document.activeElement;
            if (
              activeElement instanceof HTMLElement &&
              activeElement.id === "main-content"
            ) {
              activeElement.blur();
            }
          });
        }}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          touchAction: "none",
          WebkitTouchCallout: "none",
        }}
        data-tour="map-canvas"
      >
        <Stage
          width={width}
          height={height}
          scaleX={scale}
          scaleY={scale}
          ref={stageRef}
          onWheel={handleWheel}
          draggable={!isDrawMode}
          onDragStart={handleItemDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleItemDragEnd}
          onMouseMove={handleMouseMoveWithCursor}
          onMouseEnter={handleStageMouseEnter}
          onMouseDown={handleStageMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onMouseUp={handleStagePointerUp}
          onMouseLeave={handleStageMouseLeave}
          onContextMenu={
            enableMultiSelect
              ? (event) => event.evt.preventDefault()
              : handleContextMenu
          }
        >
          <Layer isListening={false}>
            <CanvasMapBackground
              mapPosition={mapPosition}
              stageRef={stageRef}
            />
            <CanvasUltOrbs mapPosition={mapPosition} />
            <CanvasSpawnBarriers mapPosition={mapPosition} />
            <CanvasCallouts mapPosition={mapPosition} />
            {replayOverlay}
          </Layer>
          <Layer isListening={!isDrawMode}>
            <CanvasConnectingLines onLineClick={setSelectedConnectingLine} />
            <CanvasAbilities
              deleteGroupRef={deleteGroupRef}
              mapPosition={mapPosition}
              selectionDrag={selectionDrag}
            />
            <CanvasAgents
              deleteGroupRef={deleteGroupRef}
              selectionDrag={selectionDrag}
            />
            <CanvasToolIcons
              deleteGroupRef={deleteGroupRef}
              selectionDrag={selectionDrag}
            />
            <CanvasImages
              stageRef={stageRef}
              transformerRefs={transformerRefs}
              deleteGroupRef={deleteGroupRef}
              onImageDoubleClick={setFullscreenImageSrc}
              selectionDrag={selectionDrag}
            />
            <CanvasTexts
              stageRef={stageRef}
              transformerRefs={transformerRefs}
              deleteGroupRef={deleteGroupRef}
              selectionDrag={selectionDrag}
            />
          </Layer>
          <Layer isListening={isDrawMode}>
            <CanvasDrawLines currentLineRef={currentLineRef} />
            <DeleteZone deleteGroupRef={deleteGroupRef} />
          </Layer>
          <CanvasSelectionOverlay
            stageRef={stageRef}
            outlineGroupRef={selectionOutlineGroupRef}
            scale={scale}
          />
          <Layer>
            <RemoteCursors scale={scale} />
            <CanvasNotePreview />
          </Layer>
        </Stage>

        <MobileTextEditorHost />

        <NoteEditorDialog />

        {isMobile && (
          <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-0.5 rounded-lg border bg-background/90 p-1 shadow-md backdrop-blur">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-label="Zoom in"
              onClick={handleZoomIn}
            >
              <Plus />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-label="Zoom out"
              onClick={handleZoomOut}
            >
              <Minus />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-label="Fit map"
              onClick={handleResetZoom}
            >
              <Scan />
            </Button>
          </div>
        )}

        <CanvasContextMenu
          contextMenu={contextMenu}
          onOpenChange={handlePopoverOpenChange}
          onDuplicate={handleDuplicate}
          onEditNote={
            contextMenu.capabilities.canEditNote ? handleEditNote : undefined
          }
          onToggleAlly={
            contextMenu.capabilities.canToggleAlly
              ? handleToggleAlly
              : undefined
          }
          onToggleAgentDead={
            contextMenu.capabilities.canToggleAgentDead
              ? handleToggleAgentDead
              : undefined
          }
          onSwapAbility={canSwapAbility ? handleSwapAbility : undefined}
          onToggleAbilityIconOnly={
            contextMenu.capabilities.canToggleAbilityIconOnly
              ? handleToggleAbilityIconOnly
              : undefined
          }
          onToggleAbilityOuterCircle={
            contextMenu.capabilities.canToggleAbilityOuterCircle
              ? handleToggleAbilityOuterCircle
              : undefined
          }
          onRemoveAttachedVisionCone={
            canRemoveAttachedVisionCone
              ? handleRemoveAttachedVisionCone
              : undefined
          }
          onDetachVisionCone={
            contextMenu.capabilities.canDetachVisionCone
              ? handleDetachVisionCone
              : undefined
          }
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
  ),
);

MapStage.displayName = "MapStage";
