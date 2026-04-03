import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { MAP_SIZE, WEAPONS, TEMP_DRAG_ID } from "@/lib/consts";
import { getNextId } from "@/lib/utils";
import { Vector2d } from "konva/lib/types";
import { CanvasIcon } from "@/components/canvas-icons";
import { Stage, Layer } from "react-konva";
import { ToolIconButton } from "./tool-icon-button";
import { WeaponColumn } from "./weapon-column";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface IconsSectionProps {
  mapPosition: Vector2d;
}

type PendingSidebarDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  name: string;
  width: number;
  height: number;
};

export const IconsSection = ({ mapPosition }: IconsSectionProps) => {
  const {
    setEditingTextId,
    setIsDrawMode,
    setToolIconsOnCanvas,
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    isSidebarDragActive,
    setIsSidebarDragActive,
    currentStageScale,
  } = useCanvas();
  const { notifyToolIconAdded } = useCollaborativeCanvas();

  const [dragPreviewPosition, setDragPreviewPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const pendingSidebarDragRef = useRef<PendingSidebarDrag | null>(null);

  const previewScale = currentStageScale > 0 ? currentStageScale : 1;
  const dragPreviewX = dragPreviewPosition
    ? dragPreviewPosition.x / previewScale
    : 0;
  const dragPreviewY = dragPreviewPosition
    ? dragPreviewPosition.y / previewScale
    : 0;
  const didStartSidebarDragRef = useRef(false);
  const suppressClickUntilRef = useRef(0);

  const handleAddToolIcon = (name: string, width: number, height: number) => {
    setEditingTextId(null);
    setIsDrawMode(false);

    const newToolIcon = {
      id: getNextId("tool"),
      x: mapPosition.x + MAP_SIZE / 2 + Math.round(Math.random() * 20),
      y: mapPosition.y + MAP_SIZE / 2 + Math.round(Math.random() * 20),
      name,
      width,
      height,
    };

    setToolIconsOnCanvas((prev) => [...prev, newToolIcon]);
    notifyToolIconAdded(newToolIcon);
  };

  const handleToolClick = (name: string, width: number, height: number) => {
    if (performance.now() < suppressClickUntilRef.current) {
      return;
    }

    handleAddToolIcon(name, width, height);
  };

  const handleToolPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    name: string,
    width: number,
    height: number,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();

    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    pendingSidebarDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      name,
      width,
      height,
    };
    didStartSidebarDragRef.current = false;
  };

  useEffect(() => {
    if (!isSidebarDragActive) {
      setDragPreviewPosition(null);
      return;
    }

    const handleWindowPointerMove = (event: PointerEvent) => {
      setDragPreviewPosition({ x: event.clientX, y: event.clientY });
    };

    const clearDragPreview = () => {
      setDragPreviewPosition(null);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", clearDragPreview);
    window.addEventListener("pointercancel", clearDragPreview);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", clearDragPreview);
      window.removeEventListener("pointercancel", clearDragPreview);
    };
  }, [isSidebarDragActive]);

  useEffect(() => {
    const beginToolPlacement = (
      name: string,
      width: number,
      height: number,
    ) => {
      setSelectedCanvasIcon({
        id: TEMP_DRAG_ID,
        name,
        width,
        height,
        x: -1000,
        y: -1000,
      });

      setToolIconsOnCanvas((prev) => [
        ...prev.filter((toolIcon) => toolIcon.id !== TEMP_DRAG_ID),
        {
          id: TEMP_DRAG_ID,
          name,
          width,
          height,
          x: -1000,
          y: -1000,
        },
      ]);
    };

    const handleWindowPointerMove = (event: PointerEvent) => {
      const pendingDrag = pendingSidebarDragRef.current;
      if (!pendingDrag || pendingDrag.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - pendingDrag.startX;
      const dy = event.clientY - pendingDrag.startY;
      const dragDistance = Math.hypot(dx, dy);

      if (dragDistance < 4) {
        return;
      }

      setIsDrawMode(false);
      setEditingTextId(null);
      setDragPreviewPosition({ x: event.clientX, y: event.clientY });

      beginToolPlacement(
        pendingDrag.name,
        pendingDrag.width,
        pendingDrag.height,
      );
      setIsSidebarDragActive(true);
      didStartSidebarDragRef.current = true;
      pendingSidebarDragRef.current = null;
    };

    const clearPendingDrag = (event: PointerEvent) => {
      const pendingDrag = pendingSidebarDragRef.current;
      if (pendingDrag && pendingDrag.pointerId === event.pointerId) {
        pendingSidebarDragRef.current = null;
      }

      if (didStartSidebarDragRef.current) {
        suppressClickUntilRef.current = performance.now() + 250;
        didStartSidebarDragRef.current = false;
      }
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", clearPendingDrag);
    window.addEventListener("pointercancel", clearPendingDrag);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", clearPendingDrag);
      window.removeEventListener("pointercancel", clearPendingDrag);
    };
  }, [
    setEditingTextId,
    setIsDrawMode,
    setIsSidebarDragActive,
    setSelectedCanvasIcon,
    setToolIconsOnCanvas,
  ]);

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);

    return () => {
      window.removeEventListener("resize", updateViewportSize);
    };
  }, []);

  return (
    <div className="mt-4" data-tour="icons-section">
      <div className="flex items-center justify-between mb-4">
        <span className="text-base font-semibold">Icons</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="inline-flex items-center justify-center"
              type="button"
            >
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-2">
              <p>Press E while hovering an icon on the map to delete it</p>
              <p>Click or drag an icon onto the map to place it</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      <Accordion type="multiple" className="w-full">
        <AccordionItem value="utilities">
          <AccordionTrigger className="text-sm">Spike</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-5 gap-2 pt-2">
              <ToolIconButton
                name="spike"
                onClick={() => handleToolClick("spike", 32, 32)}
                onPointerDown={(event) =>
                  handleToolPointerDown(event, "spike", 32, 32)
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="weapons">
          <AccordionTrigger className="text-sm">Guns</AccordionTrigger>
          <AccordionContent>
            <div className="flex gap-4 pt-2">
              <WeaponColumn
                weapons={WEAPONS.sidearms}
                onClick={handleToolClick}
                onPointerDown={handleToolPointerDown}
              />
              <WeaponColumn
                weapons={[...WEAPONS.smgs, ...WEAPONS.shotguns]}
                onClick={handleToolClick}
                onPointerDown={handleToolPointerDown}
              />
              <WeaponColumn
                weapons={WEAPONS.rifles}
                onClick={handleToolClick}
                onPointerDown={handleToolPointerDown}
              />
              <WeaponColumn
                weapons={[...WEAPONS.snipers, ...WEAPONS.machineGuns]}
                onClick={handleToolClick}
                onPointerDown={handleToolPointerDown}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="shields">
          <AccordionTrigger className="text-sm">Shields</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-5 gap-2 pt-2">
              <ToolIconButton
                name="light_shield"
                onClick={() => handleToolClick("light_shield", 32, 32)}
                onPointerDown={(event) =>
                  handleToolPointerDown(event, "light_shield", 32, 32)
                }
              />
              <ToolIconButton
                name="regen_shield"
                onClick={() => handleToolClick("regen_shield", 32, 32)}
                onPointerDown={(event) =>
                  handleToolPointerDown(event, "regen_shield", 32, 32)
                }
              />
              <ToolIconButton
                name="heavy_shield"
                onClick={() => handleToolClick("heavy_shield", 32, 32)}
                onPointerDown={(event) =>
                  handleToolPointerDown(event, "heavy_shield", 32, 32)
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {isSidebarDragActive &&
        selectedCanvasIcon &&
        "width" in selectedCanvasIcon &&
        dragPreviewPosition &&
        viewportSize.width > 0 &&
        viewportSize.height > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-120"
            style={{ inset: 0 }}
          >
            <Stage
              width={viewportSize.width}
              height={viewportSize.height}
              scaleX={previewScale}
              scaleY={previewScale}
            >
              <Layer listening={false}>
                <CanvasIcon
                  id={TEMP_DRAG_ID}
                  isAlly={true}
                  x={dragPreviewX}
                  y={dragPreviewY}
                  src={`/tools/${selectedCanvasIcon.name}.webp`}
                  isListening={false}
                  draggable={false}
                  width={selectedCanvasIcon.width}
                  height={selectedCanvasIcon.height}
                  borderOpacity={0}
                  strokeWidth={0}
                  radius={0}
                  fill=""
                  allyColor="#ffffff"
                  enemyColor="#ffffff"
                />
              </Layer>
            </Stage>
          </div>
        )}
    </div>
  );
};
