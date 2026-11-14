"use client";

import { useCanvasUi } from "@/contexts/canvas-context";
import { shouldSuppressCanvasItemTap } from "@/lib/canvas-long-press";
import { NOTE_BADGE_SIZE } from "@/lib/consts";
import type { ItemType } from "@/lib/types";
import type { KonvaEventObject } from "konva/lib/Node";
import { memo, useCallback } from "react";
import { Circle, Group, Path } from "react-konva";

const MESSAGE_BUBBLE_PATH =
  "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z";
const MESSAGE_BUBBLE_VIEWBOX = 24;

interface NoteBadgeProps {
  itemId: string;
  itemType: ItemType;
  x: number;
  y: number;
}

export const NoteBadge = memo(function NoteBadge({
  itemId,
  itemType,
  x,
  y,
}: NoteBadgeProps) {
  const { isDrawMode, isDraggingCanvasItem, setEditingNoteTarget } =
    useCanvasUi();

  const radius = NOTE_BADGE_SIZE / 2;
  const iconScale = (NOTE_BADGE_SIZE * 0.58) / MESSAGE_BUBBLE_VIEWBOX;

  const openEditor = useCallback(() => {
    setEditingNoteTarget({ id: itemId, type: itemType });
  }, [itemId, itemType, setEditingNoteTarget]);

  const handleClick = useCallback(
    (event: KonvaEventObject<MouseEvent>) => {
      event.cancelBubble = true;
      openEditor();
    },
    [openEditor],
  );

  const handleTap = useCallback(
    (event: KonvaEventObject<TouchEvent>) => {
      event.cancelBubble = true;
      if (shouldSuppressCanvasItemTap()) return;
      openEditor();
    },
    [openEditor],
  );

  const handlePointerEnter = useCallback(
    (event: KonvaEventObject<MouseEvent>) => {
      const stage = event.target.getStage();
      if (stage) {
        stage.container().style.cursor = "pointer";
      }
    },
    [],
  );

  const handlePointerLeave = useCallback(
    (event: KonvaEventObject<MouseEvent>) => {
      const stage = event.target.getStage();
      if (stage) {
        stage.container().style.cursor = "default";
      }
    },
    [],
  );

  const handleDoubleClick = useCallback(
    (event: KonvaEventObject<MouseEvent>) => {
      event.cancelBubble = true;
    },
    [],
  );

  const handleDoubleTap = useCallback(
    (event: KonvaEventObject<TouchEvent>) => {
      event.cancelBubble = true;
    },
    [],
  );

  if (isDrawMode || isDraggingCanvasItem) {
    return null;
  }

  return (
    <Group
      x={x}
      y={y}
      name="note-badge"
      noteTargetId={itemId}
      noteTargetType={itemType}
    >
      <Circle
        radius={radius}
        fill="#f4f4f5"
        stroke="#18181b"
        strokeWidth={1}
        shadowColor="#000000"
        shadowBlur={4}
        shadowOpacity={0.35}
        shadowOffsetY={1}
        onClick={handleClick}
        onTap={handleTap}
        onDblClick={handleDoubleClick}
        onDblTap={handleDoubleTap}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
      />
      <Path
        data={MESSAGE_BUBBLE_PATH}
        fill="#18181b"
        x={-(MESSAGE_BUBBLE_VIEWBOX / 2) * iconScale}
        y={-(MESSAGE_BUBBLE_VIEWBOX / 2) * iconScale}
        scaleX={iconScale}
        scaleY={iconScale}
        listening={false}
      />
    </Group>
  );
});
