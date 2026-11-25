import type { CanvasEntitiesSnapshot } from "@/contexts/canvas-entity-contexts";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import type {
  AbilityCanvas,
  AgentCanvas,
  CanvasSelectionItem,
  ConnectingLine,
  ImageCanvas,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";
import type { Stage } from "konva/lib/Stage";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
} from "react";
import type {
  CanvasContextMenuDeps,
  CanvasContextMenuNotifications,
} from "./canvas-context-menu-types";
import { useCanvasContextMenuBase } from "./use-canvas-context-menu-base";
import { useCanvasContextMenuDelete } from "./use-canvas-context-menu-delete";
import { useCanvasContextMenuDuplicate } from "./use-canvas-context-menu-duplicate";
import { useCanvasContextMenuToggles } from "./use-canvas-context-menu-toggles";
import { useCanvasContextMenuVisionCones } from "./use-canvas-context-menu-vision-cones";

export const useCanvasContextMenu = (
  stageRef: React.RefObject<Stage | null>,
  agentsOnCanvas: AgentCanvas[],
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>,
  abilitiesOnCanvas: AbilityCanvas[],
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>,
  textsOnCanvas: TextCanvas[],
  setTextsOnCanvas: Dispatch<SetStateAction<TextCanvas[]>>,
  imagesOnCanvas: ImageCanvas[],
  setImagesOnCanvas: Dispatch<SetStateAction<ImageCanvas[]>>,
  toolIconsOnCanvas: ToolIconCanvas[],
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>,
  connectingLines: ConnectingLine[],
  setConnectingLines: Dispatch<SetStateAction<ConnectingLine[]>>,
  selectedCanvasItems: CanvasSelectionItem[],
  setSelectedCanvasItems: Dispatch<SetStateAction<CanvasSelectionItem[]>>,
  getLatestEntities?: () => CanvasEntitiesSnapshot,
  onEditNote?: (target: CanvasSelectionItem) => void,
) => {
  const notifications = useCollaborativeCanvas();

  const deps: CanvasContextMenuDeps = {
    stageRef,
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    textsOnCanvas,
    setTextsOnCanvas,
    imagesOnCanvas,
    setImagesOnCanvas,
    toolIconsOnCanvas,
    setToolIconsOnCanvas,
    connectingLines,
    setConnectingLines,
    selectedCanvasItems,
    setSelectedCanvasItems,
    getLatestEntities,
    onEditNote,
  };

  const base = useCanvasContextMenuBase(deps);
  const { contextMenu, capabilities, closeContextMenu } = base;

  const notificationDeps: CanvasContextMenuNotifications = notifications;

  const { handleDuplicate } = useCanvasContextMenuDuplicate({
    session: base,
    ...deps,
    ...notificationDeps,
  });
  const { handleDelete } = useCanvasContextMenuDelete({
    session: base,
    ...deps,
    ...notificationDeps,
  });
  const {
    handleToggleAlly,
    handleToggleAgentDead,
    handleSwapAbility,
    handleToggleAbilityIconOnly,
    handleToggleAbilityOuterCircle,
  } = useCanvasContextMenuToggles({
    session: base,
    ...deps,
    ...notificationDeps,
  });
  const { handleRemoveAttachedVisionCone, handleDetachVisionCone } =
    useCanvasContextMenuVisionCones({
      session: base,
      ...deps,
      ...notificationDeps,
    });

  const handleEditNote = useCallback(() => {
    if (!contextMenu.open) return;

    onEditNote?.({
      id: contextMenu.anchorId,
      type: contextMenu.anchorType,
    });
    closeContextMenu();
  }, [closeContextMenu, contextMenu, onEditNote]);

  const contextMenuWithCapabilities = useMemo(
    () => ({
      ...contextMenu,
      capabilities,
    }),
    [contextMenu, capabilities],
  );

  return {
    contextMenu: contextMenuWithCapabilities,
    openContextMenu: base.openContextMenu,
    handleContextMenu: base.handleContextMenu,
    handlePopoverOpenChange: base.handlePopoverOpenChange,
    handleDuplicate,
    handleDelete,
    handleEditNote,
    handleToggleAlly,
    handleToggleAgentDead,
    handleSwapAbility,
    handleToggleAbilityIconOnly,
    handleToggleAbilityOuterCircle,
    handleRemoveAttachedVisionCone,
    handleDetachVisionCone,
    closeContextMenu,
  };
};
