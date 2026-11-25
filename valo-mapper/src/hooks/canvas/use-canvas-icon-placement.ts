import type { CanvasEntitiesSnapshot } from "@/contexts/canvas-entity-contexts";
import type { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { TEMP_DRAG_ID } from "@/lib/consts";
import { getNextId } from "@/lib/ids";
import { isAgent } from "@/lib/utils";
import {
  applyVisionConeAttachment,
  canAttachVisionCone,
  createDefaultAttachedVisionCone,
  findVisionConeAttachmentTarget,
} from "@/lib/vision-cone-utils";
import {
  canAttachToolIcon,
  findToolIconAttachmentTarget,
  getToolIconAttachmentPosition,
} from "@/lib/tool-icon";
import type {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  IconSettings,
  ToolIconCanvas,
} from "@/lib/types";
import type { Stage } from "konva/lib/Stage";
import type { Vector2d } from "konva/lib/types";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";

type IconPlacementNotifications = Pick<
  ReturnType<typeof useCollaborativeCanvas>,
  | "notifyAgentAdded"
  | "notifyAbilityAdded"
  | "notifyAbilityRemoved"
  | "notifyToolIconAdded"
>;

interface UseCanvasIconPlacementOptions extends IconPlacementNotifications {
  stageRef: RefObject<Stage | null>;
  selectedCanvasIcon: Agent | AbilityIconItem | ToolIconCanvas | null;
  setSelectedCanvasIcon: Dispatch<
    SetStateAction<Agent | AbilityIconItem | ToolIconCanvas | null>
  >;
  isSidebarDragActive: boolean;
  setIsSidebarDragActive: Dispatch<SetStateAction<boolean>>;
  getLatestEntities: () => CanvasEntitiesSnapshot;
  getWorldPointerPosition: () => Vector2d | null;
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>;
  agentsSettings: IconSettings;
  abilitiesSettings: IconSettings;
}

export const useCanvasIconPlacement = ({
  stageRef,
  selectedCanvasIcon,
  setSelectedCanvasIcon,
  isSidebarDragActive,
  setIsSidebarDragActive,
  getLatestEntities,
  getWorldPointerPosition,
  setAgentsOnCanvas,
  setAbilitiesOnCanvas,
  setToolIconsOnCanvas,
  agentsSettings,
  abilitiesSettings,
  notifyAgentAdded,
  notifyAbilityAdded,
  notifyAbilityRemoved,
  notifyToolIconAdded,
}: UseCanvasIconPlacementOptions) => {
  const frameRef = useRef<number | null>(null);

  const removeTempDragIcon = useCallback(() => {
    if (!selectedCanvasIcon) return;

    if (isAgent(selectedCanvasIcon)) {
      setAgentsOnCanvas((prev) =>
        prev.filter((icon) => icon.id !== TEMP_DRAG_ID),
      );
    } else if ("action" in selectedCanvasIcon) {
      setAbilitiesOnCanvas((prev) =>
        prev.filter((icon) => icon.id !== TEMP_DRAG_ID),
      );
    } else {
      setToolIconsOnCanvas((prev) =>
        prev.filter((icon) => icon.id !== TEMP_DRAG_ID),
      );
    }

    setSelectedCanvasIcon(null);
    setIsSidebarDragActive(false);
  }, [
    selectedCanvasIcon,
    setAbilitiesOnCanvas,
    setAgentsOnCanvas,
    setToolIconsOnCanvas,
    setSelectedCanvasIcon,
    setIsSidebarDragActive,
  ]);

  const handleIconPlacement = useCallback(
    (position?: Vector2d) => {
      const stage = stageRef.current;
      if (!stage || !selectedCanvasIcon) return;

      const { agentsOnCanvas, abilitiesOnCanvas, toolIconsOnCanvas } =
        getLatestEntities();

      let pos: Vector2d;
      if (position) {
        pos = position;
      } else {
        const tempDragIcon = stage.findOne(`#${TEMP_DRAG_ID}`);
        if (!tempDragIcon) return;
        pos = tempDragIcon.position();
      }

      const isAbilityIcon = "action" in selectedCanvasIcon;
      const newId = getNextId(
        isAgent(selectedCanvasIcon)
          ? "agent"
          : isAbilityIcon
            ? "ability"
            : "tool",
      );

      if (isAgent(selectedCanvasIcon)) {
        const newAgent = {
          ...selectedCanvasIcon,
          id: newId,
          x: pos.x,
          y: pos.y,
          isAlly:
            agentsOnCanvas.find((a) => a.id === TEMP_DRAG_ID)?.isAlly ?? true,
        };
        setAgentsOnCanvas((prev) =>
          prev.map((agent) => (agent.id === TEMP_DRAG_ID ? newAgent : agent)),
        );
        notifyAgentAdded(newAgent);
      } else if (isAbilityIcon) {
        const tempAbility = abilitiesOnCanvas.find(
          (a) => a.id === TEMP_DRAG_ID,
        );
        const attachmentTarget =
          tempAbility && canAttachVisionCone(tempAbility)
            ? findVisionConeAttachmentTarget({
                point: pos,
                agentsOnCanvas,
                abilitiesOnCanvas,
                toolIconsOnCanvas,
                agentsSettings,
                abilitiesSettings,
                excludeId: TEMP_DRAG_ID,
              })
            : null;
        const newAbility = {
          ...selectedCanvasIcon,
          id: newId,
          x: attachmentTarget?.x ?? pos.x,
          y: attachmentTarget?.y ?? pos.y,
          isAlly: tempAbility?.isAlly ?? true,
          iconOnly: tempAbility?.iconOnly ?? false,
          showOuterCircle: tempAbility?.showOuterCircle ?? true,
          attachedToId: attachmentTarget?.id,
        };

        const { nextAbilitiesOnCanvas, removedAbilityIds } =
          applyVisionConeAttachment({
            abilitiesOnCanvas,
            previousAbilityId: TEMP_DRAG_ID,
            nextAbility: newAbility,
          });

        const defaultAttachedCone = createDefaultAttachedVisionCone(
          newAbility,
          getNextId("ability"),
        );
        if (defaultAttachedCone) {
          nextAbilitiesOnCanvas.push(defaultAttachedCone);
        }

        setAbilitiesOnCanvas(nextAbilitiesOnCanvas);
        removedAbilityIds.forEach((abilityId) =>
          notifyAbilityRemoved(abilityId),
        );
        notifyAbilityAdded(newAbility);
        if (defaultAttachedCone) {
          notifyAbilityAdded(defaultAttachedCone);
        }
      } else {
        const tempToolIcon = toolIconsOnCanvas.find(
          (toolIcon) => toolIcon.id === TEMP_DRAG_ID,
        );

        const attachmentHost =
          tempToolIcon && canAttachToolIcon(tempToolIcon)
            ? findToolIconAttachmentTarget({
                point: pos,
                agentsOnCanvas,
                agentsSettings,
                excludeId: TEMP_DRAG_ID,
              })
            : null;

        const toolIconPosition = attachmentHost
          ? getToolIconAttachmentPosition(
              tempToolIcon ?? selectedCanvasIcon,
              attachmentHost.x,
              attachmentHost.y,
              agentsSettings,
            )
          : { x: pos.x, y: pos.y };

        const newToolIcon = {
          ...selectedCanvasIcon,
          id: newId,
          x: toolIconPosition.x,
          y: toolIconPosition.y,
          attachedToId: attachmentHost?.id,
        };
        setToolIconsOnCanvas((prev) =>
          prev.map((toolIcon) =>
            toolIcon.id === TEMP_DRAG_ID ? newToolIcon : toolIcon,
          ),
        );
        notifyToolIconAdded(newToolIcon);
      }

      setSelectedCanvasIcon(null);
    },
    [
      selectedCanvasIcon,
      agentsSettings,
      abilitiesSettings,
      getLatestEntities,
      setAbilitiesOnCanvas,
      setAgentsOnCanvas,
      setToolIconsOnCanvas,
      setSelectedCanvasIcon,
      stageRef,
      notifyAgentAdded,
      notifyAbilityAdded,
      notifyAbilityRemoved,
      notifyToolIconAdded,
    ],
  );

  const updateTempDragPreview = useCallback(
    (worldPos: Vector2d) => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        const stage = stageRef.current;
        const tempDragIcon = stage?.findOne(`#${TEMP_DRAG_ID}`);
        if (tempDragIcon) {
          tempDragIcon.position(worldPos);
          tempDragIcon.getLayer()?.batchDraw();
        }
      });
    },
    [stageRef],
  );

  useEffect(() => {
    if (!isSidebarDragActive) {
      return;
    }

    const handleWindowPointerMove = (event: PointerEvent) => {
      const stage = stageRef.current;
      if (!stage || !selectedCanvasIcon) {
        return;
      }

      stage.setPointersPositions(event as unknown as MouseEvent);
      const worldPos = getWorldPointerPosition();
      if (!worldPos) {
        return;
      }

      updateTempDragPreview(worldPos);
    };

    const handleWindowPointerUp = (event: PointerEvent) => {
      const stage = stageRef.current;
      if (!stage) {
        setIsSidebarDragActive(false);
        return;
      }

      if (event.type === "pointercancel") {
        removeTempDragIcon();
        setIsSidebarDragActive(false);
        return;
      }

      const stageContainer = stage.container();
      const target = event.target;
      const releasedWithinStageBounds = (() => {
        const rect = stageContainer.getBoundingClientRect();
        return (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        );
      })();
      const isReleasedOverStage =
        releasedWithinStageBounds ||
        (target instanceof Node && stageContainer.contains(target));

      if (isReleasedOverStage && selectedCanvasIcon) {
        stage.setPointersPositions(event as unknown as MouseEvent);
        const worldPos = getWorldPointerPosition();
        if (worldPos) {
          handleIconPlacement(worldPos);
        } else {
          handleIconPlacement();
        }
      } else {
        removeTempDragIcon();
      }

      setIsSidebarDragActive(false);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [
    isSidebarDragActive,
    stageRef,
    selectedCanvasIcon,
    getWorldPointerPosition,
    updateTempDragPreview,
    handleIconPlacement,
    removeTempDragIcon,
    setIsSidebarDragActive,
  ]);

  return {
    handleIconPlacement,
    removeTempDragIcon,
    updateTempDragPreview,
  };
};
