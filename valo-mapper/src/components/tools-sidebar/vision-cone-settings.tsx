import { useCallback, useEffect, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToolIconButton } from "./tool-icon-button";
import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { ABILITY_LOOKUP } from "@/lib/consts/configs/agent-icon/consts";
import { MAP_SIZE, TEMP_DRAG_ID, VISION_CONE_ITEMS } from "@/lib/consts";
import { getNextId } from "@/lib/utils";

export const VisionConeSettings = ({
  mapPosition,
}: {
  mapPosition: { x: number; y: number };
}) => {
  const {
    setIsDrawMode,
    setEditingTextId,
    setAbilitiesOnCanvas,
    setSelectedCanvasIcon,
    selectedCanvasIcon,
    setIsSidebarDragActive,
    isAlly,
  } = useCanvas();
  const { notifyAbilityAdded } = useCollaborativeCanvas();

  const pendingVisionConeDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    name: string;
  } | null>(null);
  const didStartVisionConeDragRef = useRef(false);
  const suppressVisionConeClickUntilRef = useRef(0);

  const placeVisionCone = useCallback(
    (coneName: string) => {
      const ability = ABILITY_LOOKUP[coneName];
      if (!ability) return;

      const newAbility = {
        ...ability,
        id: getNextId("ability"),
        x: mapPosition.x + MAP_SIZE / 2 + Math.round(Math.random() * 20),
        y: mapPosition.y + MAP_SIZE / 2 + Math.round(Math.random() * 20),
        isAlly,
        iconOnly: false,
        showOuterCircle: true,
      };

      setAbilitiesOnCanvas((prev) => [...prev, newAbility]);
      notifyAbilityAdded(newAbility);
    },
    [mapPosition, isAlly, notifyAbilityAdded, setAbilitiesOnCanvas],
  );

  const beginVisionConePlacement = useCallback(
    (coneName: string) => {
      const ability = ABILITY_LOOKUP[coneName];
      if (!ability) return;

      setSelectedCanvasIcon(ability);

      const tempAbility = {
        ...ability,
        id: TEMP_DRAG_ID,
        x: -1000,
        y: -1000,
        isAlly,
        iconOnly: false,
        showOuterCircle: true,
      };

      setAbilitiesOnCanvas((prev) => [
        ...prev.filter((ability) => ability.id !== TEMP_DRAG_ID),
        tempAbility,
      ]);
    },
    [isAlly, setAbilitiesOnCanvas, setSelectedCanvasIcon],
  );

  const handleVisionConeClick = useCallback(
    (coneName: string) => {
      if (performance.now() < suppressVisionConeClickUntilRef.current) {
        return;
      }

      placeVisionCone(coneName);
      setIsSidebarDragActive(false);
    },
    [placeVisionCone, setIsSidebarDragActive],
  );

  const handleVisionConePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, coneName: string) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();

      if (typeof event.currentTarget.setPointerCapture === "function") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      const isSame =
        selectedCanvasIcon && !("action" in selectedCanvasIcon)
          ? false
          : selectedCanvasIcon?.name === coneName;

      if (isSame) {
        return;
      }

      pendingVisionConeDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        name: coneName,
      };
      didStartVisionConeDragRef.current = false;
    },
    [selectedCanvasIcon],
  );

  useEffect(() => {
    const DRAG_START_DISTANCE_PX = 4;

    const handleWindowPointerMove = (event: PointerEvent) => {
      const pending = pendingVisionConeDragRef.current;
      if (!pending || pending.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - pending.startX;
      const dy = event.clientY - pending.startY;
      const distance = Math.hypot(dx, dy);

      if (distance < DRAG_START_DISTANCE_PX) {
        return;
      }

      setIsDrawMode(false);
      setEditingTextId(null);

      beginVisionConePlacement(pending.name);
      setIsSidebarDragActive(true);
      didStartVisionConeDragRef.current = true;
      pendingVisionConeDragRef.current = null;
    };

    const clearPendingDrag = (event: PointerEvent) => {
      const pending = pendingVisionConeDragRef.current;
      if (pending && pending.pointerId === event.pointerId) {
        pendingVisionConeDragRef.current = null;
      }

      if (didStartVisionConeDragRef.current) {
        suppressVisionConeClickUntilRef.current = performance.now() + 250;
        didStartVisionConeDragRef.current = false;
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
    beginVisionConePlacement,
    setEditingTextId,
    setIsDrawMode,
    setIsSidebarDragActive,
  ]);

  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      {VISION_CONE_ITEMS.map((item) => (
        <Tooltip key={item.action}>
          <TooltipTrigger asChild>
            <ToolIconButton
              name={item.icon}
              fileEnding="svg"
              onClick={() => handleVisionConeClick(item.name)}
              onPointerDown={(event) =>
                handleVisionConePointerDown(event, item.name)
              }
            />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            {item.tooltip}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};
