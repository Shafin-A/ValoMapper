import { useCanvas, useCanvasScale } from "@/contexts/canvas-context";
import {
  WEAPONS,
  TEMP_DRAG_ID,
  TOOL_ICON_CONTOUR_COLOR,
  TOOL_ICON_CONTOUR_WIDTH,
} from "@/lib/consts";

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
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { InfoHint } from "@/components/shared/info-hint";

interface IconsSectionProps {
  setSidebarOpen?: Dispatch<SetStateAction<boolean>>;
}

type PendingSidebarDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  name: string;
  width: number;
  height: number;
};

export const IconsSection = ({ setSidebarOpen }: IconsSectionProps) => {
  const isMobile = useIsMobile();
  const {
    setEditingTextId,
    setIsDrawMode,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setToolIconsOnCanvas,
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    isSidebarDragActive,
    setIsSidebarDragActive,
  } = useCanvas();

  const selectedToolIconName =
    selectedCanvasIcon && "width" in selectedCanvasIcon
      ? selectedCanvasIcon.name
      : null;

  const [dragPreviewPosition, setDragPreviewPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const pendingSidebarDragRef = useRef<PendingSidebarDrag | null>(null);
  const didStartSidebarDragRef = useRef(false);
  const suppressClickUntilRef = useRef(0);

  const beginToolPlacement = useCallback(
    (name: string, width: number, height: number) => {
      setEditingTextId(null);
      setIsDrawMode(false);

      const temporaryToolIcon = {
        id: TEMP_DRAG_ID,
        name,
        width,
        height,
        x: -1000,
        y: -1000,
      };

      setSelectedCanvasIcon(temporaryToolIcon);
      setAgentsOnCanvas((prev) =>
        prev.filter((agent) => agent.id !== TEMP_DRAG_ID),
      );
      setAbilitiesOnCanvas((prev) =>
        prev.filter((ability) => ability.id !== TEMP_DRAG_ID),
      );
      setToolIconsOnCanvas((prev) => [
        ...prev.filter((toolIcon) => toolIcon.id !== TEMP_DRAG_ID),
        temporaryToolIcon,
      ]);
    },
    [
      setAbilitiesOnCanvas,
      setAgentsOnCanvas,
      setEditingTextId,
      setIsDrawMode,
      setSelectedCanvasIcon,
      setToolIconsOnCanvas,
    ],
  );

  const handleToolClick = (name: string, width: number, height: number) => {
    if (performance.now() < suppressClickUntilRef.current) {
      return;
    }

    const isSameTool =
      selectedCanvasIcon &&
      "width" in selectedCanvasIcon &&
      selectedCanvasIcon.name === name;

    if (isSameTool) {
      setSelectedCanvasIcon(null);
      setToolIconsOnCanvas((prev) =>
        prev.filter((toolIcon) => toolIcon.id !== TEMP_DRAG_ID),
      );
      return;
    }

    beginToolPlacement(name, width, height);
    if (isMobile) {
      setSidebarOpen?.(false);
    }
  };

  const handleToolPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    name: string,
    width: number,
    height: number,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.pointerType === "pen") return;
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
    beginToolPlacement,
    setEditingTextId,
    setIsDrawMode,
    setIsSidebarDragActive,
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
        <InfoHint label="About icons">
          <div className="space-y-2">
            {isMobile ? (
              <>
                <p>Tap an icon to select it, then tap the map to place it.</p>
                <p>
                  Or drag an icon onto the map. Drag it to the trash zone to
                  delete it.
                </p>
              </>
            ) : (
              <>
                <p>Press E while hovering an icon on the map to delete it</p>
                <p>Click or drag an icon onto the map to place it</p>
              </>
            )}
          </div>
        </InfoHint>
      </div>

      <Accordion type="multiple" className="w-full">
        <AccordionItem value="utilities">
          <AccordionTrigger className="text-sm">Spike</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-5 gap-2 pt-2">
              <ToolIconButton
                name="spike"
                selected={selectedToolIconName === "spike"}
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
                selectedToolName={selectedToolIconName}
                onClick={handleToolClick}
                onPointerDown={handleToolPointerDown}
              />
              <WeaponColumn
                weapons={[...WEAPONS.smgs, ...WEAPONS.shotguns]}
                selectedToolName={selectedToolIconName}
                onClick={handleToolClick}
                onPointerDown={handleToolPointerDown}
              />
              <WeaponColumn
                weapons={WEAPONS.rifles}
                selectedToolName={selectedToolIconName}
                onClick={handleToolClick}
                onPointerDown={handleToolPointerDown}
              />
              <WeaponColumn
                weapons={[...WEAPONS.snipers, ...WEAPONS.machineGuns]}
                selectedToolName={selectedToolIconName}
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
                selected={selectedToolIconName === "light_shield"}
                onClick={() => handleToolClick("light_shield", 32, 32)}
                onPointerDown={(event) =>
                  handleToolPointerDown(event, "light_shield", 32, 32)
                }
              />
              <ToolIconButton
                name="regen_shield"
                selected={selectedToolIconName === "regen_shield"}
                onClick={() => handleToolClick("regen_shield", 32, 32)}
                onPointerDown={(event) =>
                  handleToolPointerDown(event, "regen_shield", 32, 32)
                }
              />
              <ToolIconButton
                name="heavy_shield"
                selected={selectedToolIconName === "heavy_shield"}
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
          <ToolsDragPreview
            position={dragPreviewPosition}
            viewportSize={viewportSize}
            icon={selectedCanvasIcon}
          />
        )}
    </div>
  );
};

interface ToolsDragPreviewProps {
  position: { x: number; y: number };
  viewportSize: { width: number; height: number };
  icon: { name: string; width: number; height: number };
}

const ToolsDragPreview = ({
  position,
  viewportSize,
  icon,
}: ToolsDragPreviewProps) => {
  const { currentStageScale } = useCanvasScale();
  const previewScale = currentStageScale > 0 ? currentStageScale : 1;
  const dragPreviewX = position.x / previewScale;
  const dragPreviewY = position.y / previewScale;

  return (
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
            src={`/tools/${icon.name}.webp`}
            isListening={false}
            draggable={false}
            width={icon.width}
            height={icon.height}
            borderOpacity={0}
            strokeWidth={0}
            contourColor={TOOL_ICON_CONTOUR_COLOR}
            contourWidth={TOOL_ICON_CONTOUR_WIDTH}
            radius={0}
            fill=""
            allyColor="#ffffff"
            enemyColor="#ffffff"
          />
        </Layer>
      </Stage>
    </div>
  );
};
