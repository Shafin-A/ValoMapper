import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useCanvasItemActions, type CanvasItemMove } from "@/hooks/canvas/use-canvas-item-actions";
import {
  type CanvasItemCollections,
  getCanvasItemInstance,
} from "@/lib/canvas-selection";
import type { CanvasSelectionItem } from "@/lib/types";
import {
  syncAttachedToolIconNodePositions,
} from "@/lib/tool-icon";
import { syncAttachedVisionConeNodePositions } from "@/lib/vision-cone-utils";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Vector2d } from "konva/lib/types";
import { useCallback, useMemo, useRef } from "react";

type GroupDragState = {
  anchorId: string;
  starts: Map<string, Vector2d>;
};

export interface SelectionDragController {
  isMultiSelected: (id: string) => boolean;
  handleDragMove: (event: KonvaEventObject<DragEvent>) => void;
  handleDragEnd: (event: KonvaEventObject<DragEvent>) => boolean;
}

interface UseCanvasSelectionDragOptions {
  outlineGroupRef?: React.RefObject<Konva.Group | null>;
}

export const useCanvasSelectionDrag = ({
  outlineGroupRef,
}: UseCanvasSelectionDragOptions = {}): SelectionDragController => {
  const {
    selectedCanvasItems,
    agentsOnCanvas,
    abilitiesOnCanvas,
    textsOnCanvas,
    imagesOnCanvas,
    toolIconsOnCanvas,
    getRegisteredNode,
  } = useCanvas();
  const { agentsSettings } = useSettings();
  const { deleteItems, moveItems } = useCanvasItemActions();

  const groupDragRef = useRef<GroupDragState | null>(null);
  const frameRef = useRef<number | null>(null);

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

  const selectedIdSet = useMemo(
    () => new Set(selectedCanvasItems.map((selection) => selection.id)),
    [selectedCanvasItems],
  );

  const isMultiSelected = useCallback(
    (id: string) =>
      selectedCanvasItems.length > 1 && selectedIdSet.has(id),
    [selectedCanvasItems.length, selectedIdSet],
  );

  const buildGroupDragState = useCallback(
    (anchorId: string): GroupDragState => {
      const starts = new Map<string, Vector2d>();

      selectedCanvasItems.forEach((selection) => {
        const entry = getCanvasItemInstance(collections, selection);
        if (entry) {
          starts.set(entry.item.id, {
            x: entry.item.x,
            y: entry.item.y,
          });
        }
      });

      return {
        anchorId,
        starts,
      };
    },
    [collections, selectedCanvasItems],
  );

  const scheduleDragOffset = useCallback(
    (offset: Vector2d) => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        const group = outlineGroupRef?.current;
        if (group) {
          group.position(offset);
          group.getLayer()?.batchDraw();
        }
        frameRef.current = null;
      });
    },
    [outlineGroupRef],
  );

  const syncAttachedNodes = useCallback(
    (
      selection: CanvasSelectionItem,
      node: import("konva/lib/Node").Node,
    ) => {
      const entry = getCanvasItemInstance(collections, selection);
      if (!entry) return;

      if (entry.type === "agent") {
        syncAttachedVisionConeNodePositions({
          hostId: entry.item.id,
          hostNode: node,
          abilitiesOnCanvas,
          getRegisteredNode,
        });
        syncAttachedToolIconNodePositions({
          hostId: entry.item.id,
          hostNode: node,
          toolIconsOnCanvas,
          agentsSettings,
          getRegisteredNode,
        });
        return;
      }

      if (entry.type === "ability" || entry.type === "tool") {
        syncAttachedVisionConeNodePositions({
          hostId: entry.item.id,
          hostNode: node,
          abilitiesOnCanvas,
          getRegisteredNode,
        });
      }
    },
    [
      abilitiesOnCanvas,
      agentsSettings,
      collections,
      getRegisteredNode,
      toolIconsOnCanvas,
    ],
  );

  const resetGroupDrag = useCallback(() => {
    groupDragRef.current = null;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const group = outlineGroupRef?.current;
    if (group) {
      group.position({ x: 0, y: 0 });
      group.getLayer()?.batchDraw();
    }
  }, [outlineGroupRef]);

  const handleDragMove = useCallback(
    (event: KonvaEventObject<DragEvent>) => {
      const id = event.target.id();
      if (!selectedIdSet.has(id)) return;

      if (!isMultiSelected(id)) {
        const selection = selectedCanvasItems.find((item) => item.id === id);
        if (!selection) return;

        const entry = getCanvasItemInstance(collections, selection);
        if (!entry) return;

        scheduleDragOffset({
          x: event.target.x() - entry.item.x,
          y: event.target.y() - entry.item.y,
        });
        return;
      }

      const group = groupDragRef.current ?? buildGroupDragState(id);
      if (!groupDragRef.current) {
        groupDragRef.current = group;
      }

      const anchorStart = group.starts.get(group.anchorId);
      if (!anchorStart) return;

      const deltaX = event.target.x() - anchorStart.x;
      const deltaY = event.target.y() - anchorStart.y;

      const stage = event.target.getStage();
      if (!stage) return;

      selectedCanvasItems.forEach((selection) => {
        if (selection.id === group.anchorId) {
          const anchorNode =
            getRegisteredNode(selection.id) ??
            stage.findOne(`#${selection.id}`);
          if (anchorNode) {
            syncAttachedNodes(selection, anchorNode);
          }
          return;
        }

        const start = group.starts.get(selection.id);
        if (!start) return;

        const node =
          getRegisteredNode(selection.id) ??
          stage.findOne(`#${selection.id}`);
        if (!node) return;

        node.position({
          x: start.x + deltaX,
          y: start.y + deltaY,
        });
        syncAttachedNodes(selection, node);
      });

      scheduleDragOffset({ x: deltaX, y: deltaY });
    },
    [
      buildGroupDragState,
      collections,
      getRegisteredNode,
      isMultiSelected,
      scheduleDragOffset,
      selectedCanvasItems,
      selectedIdSet,
      syncAttachedNodes,
    ],
  );

  const handleDragEnd = useCallback(
    (event: KonvaEventObject<DragEvent>) => {
      const id = event.target.id();
      const group = groupDragRef.current;

      if (!group && !isMultiSelected(id)) {
        if (selectedIdSet.has(id)) {
          requestAnimationFrame(() => resetGroupDrag());
        }
        return false;
      }

      const stage = event.target.getStage();
      const isOverDeleteGroup = Boolean(
        event.target.getAttr("isOverDeleteGroup"),
      );

      const moves: CanvasItemMove[] = [];

      if (stage) {
        selectedCanvasItems.forEach((selection) => {
          const entry = getCanvasItemInstance(collections, selection);
          if (!entry) return;

          const node =
            getRegisteredNode(selection.id) ??
            stage.findOne(`#${selection.id}`);
          if (!node) return;

          moves.push({
            entry,
            x: node.x(),
            y: node.y(),
          });
        });
      }

      resetGroupDrag();

      if (isOverDeleteGroup) {
        deleteItems(selectedCanvasItems);
        return true;
      }

      if (moves.length > 0) {
        moveItems(moves);
      }

      return true;
    },
    [
      collections,
      deleteItems,
      getRegisteredNode,
      isMultiSelected,
      moveItems,
      resetGroupDrag,
      selectedCanvasItems,
      selectedIdSet,
    ],
  );

  return {
    isMultiSelected,
    handleDragMove,
    handleDragEnd,
  };
};
