import {
  type CanvasItemCollections,
  filterExistingSelection,
  getCanvasItemInstance,
  getContextMenuCapabilities,
  resolveCanvasItemTarget,
} from "@/lib/canvas-selection";
import { useCallback, useMemo, useState } from "react";
import type {
  CanvasContextMenuBase,
  CanvasContextMenuDeps,
  ContextMenuState,
} from "./canvas-context-menu-types";

export const useCanvasContextMenuBase = ({
  stageRef,
  agentsOnCanvas,
  abilitiesOnCanvas,
  textsOnCanvas,
  imagesOnCanvas,
  toolIconsOnCanvas,
  connectingLines,
  selectedCanvasItems,
  setSelectedCanvasItems,
  getLatestEntities,
}: Pick<
  CanvasContextMenuDeps,
  | "stageRef"
  | "agentsOnCanvas"
  | "abilitiesOnCanvas"
  | "textsOnCanvas"
  | "imagesOnCanvas"
  | "toolIconsOnCanvas"
  | "connectingLines"
  | "selectedCanvasItems"
  | "setSelectedCanvasItems"
  | "getLatestEntities"
>): CanvasContextMenuBase => {
  const collections = useMemo<CanvasItemCollections>(
    () => ({
      agentsOnCanvas,
      abilitiesOnCanvas,
      textsOnCanvas,
      imagesOnCanvas,
      toolIconsOnCanvas,
    }),
    [
      agentsOnCanvas,
      abilitiesOnCanvas,
      textsOnCanvas,
      imagesOnCanvas,
      toolIconsOnCanvas,
    ],
  );

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    targetItems: [],
    anchorId: "",
    anchorType: "agent",
  });

  const capabilities = useMemo(() => {
    const targets = contextMenu.targetItems
      .map((selection) => getCanvasItemInstance(collections, selection))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return getContextMenuCapabilities(targets, collections);
  }, [collections, contextMenu.targetItems]);

  const getEntities = useCallback(() => {
    const latest = getLatestEntities?.();

    return {
      agentsOnCanvas: latest?.agentsOnCanvas ?? agentsOnCanvas,
      abilitiesOnCanvas: latest?.abilitiesOnCanvas ?? abilitiesOnCanvas,
      textsOnCanvas: latest?.textsOnCanvas ?? textsOnCanvas,
      imagesOnCanvas: latest?.imagesOnCanvas ?? imagesOnCanvas,
      toolIconsOnCanvas: latest?.toolIconsOnCanvas ?? toolIconsOnCanvas,
      connectingLines: latest?.connectingLines ?? connectingLines,
      drawLines: latest?.drawLines ?? [],
    };
  }, [
    getLatestEntities,
    agentsOnCanvas,
    abilitiesOnCanvas,
    textsOnCanvas,
    imagesOnCanvas,
    toolIconsOnCanvas,
    connectingLines,
  ]);

  const getCollections = useCallback((): CanvasItemCollections => {
    const entities = getEntities();

    return {
      agentsOnCanvas: entities.agentsOnCanvas,
      abilitiesOnCanvas: entities.abilitiesOnCanvas,
      textsOnCanvas: entities.textsOnCanvas,
      imagesOnCanvas: entities.imagesOnCanvas,
      toolIconsOnCanvas: entities.toolIconsOnCanvas,
    };
  }, [getEntities]);

  const getAnchorEntry = useCallback(() => {
    return getCanvasItemInstance(getCollections(), {
      id: contextMenu.anchorId,
      type: contextMenu.anchorType,
    });
  }, [getCollections, contextMenu.anchorId, contextMenu.anchorType]);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, []);

  const openContextMenu = useCallback<CanvasContextMenuBase["openContextMenu"]>(
    (targetNode, pointerPosition) => {
      const stage = stageRef.current;
      if (!stage) return;

      const latestCollections = getCollections();
      const resolvedTarget = resolveCanvasItemTarget(
        targetNode,
        latestCollections,
      );

      if (!resolvedTarget) {
        setSelectedCanvasItems([]);
        setContextMenu((previous) => ({ ...previous, open: false }));
        return;
      }

      const pointer = pointerPosition ?? stage.getPointerPosition();
      if (!pointer) return;

      const isAlreadySelected = selectedCanvasItems.some(
        (selection) =>
          selection.id === resolvedTarget.id &&
          selection.type === resolvedTarget.type,
      );

      const targetItems = isAlreadySelected
        ? filterExistingSelection(latestCollections, selectedCanvasItems)
        : [resolvedTarget];

      if (targetItems.length === 0) {
        targetItems.push(resolvedTarget);
      }

      if (!isAlreadySelected) {
        setSelectedCanvasItems([resolvedTarget]);
      }

      const containerRect = stage.container().getBoundingClientRect();

      setContextMenu({
        open: true,
        x: containerRect.left + pointer.x,
        y: containerRect.top + pointer.y,
        targetItems,
        anchorId: resolvedTarget.id,
        anchorType: resolvedTarget.type,
      });
    },
    [
      getCollections,
      selectedCanvasItems,
      setSelectedCanvasItems,
      stageRef,
    ],
  );

  const handleContextMenu = useCallback<CanvasContextMenuBase["handleContextMenu"]>(
    (e) => {
      e.evt.preventDefault();
      openContextMenu(
        e.target as unknown as Parameters<typeof openContextMenu>[0],
        stageRef.current?.getPointerPosition() ?? null,
      );
      e.cancelBubble = true;
    },
    [openContextMenu, stageRef],
  );

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    setContextMenu((prev) => ({ ...prev, open }));
  }, []);

  return {
    contextMenu,
    capabilities,
    getEntities,
    getCollections,
    getAnchorEntry,
    closeContextMenu,
    openContextMenu,
    handleContextMenu,
    handlePopoverOpenChange,
  };
};
