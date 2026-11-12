import { isMobileLayout } from "@/lib/mobile-layout";
import type { BaseCanvasItem, ConnectingLine } from "@/lib/types";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Dispatch, RefObject, SetStateAction } from "react";

export const handleMouseOverGrabCursor = (e: KonvaEventObject<MouseEvent>) => {
  e.target.getStage()!.container().style.cursor = "grab";
};

export const handleMouseOverPointerCursor = (
  e: KonvaEventObject<MouseEvent>,
) => {
  e.target.getStage()!.container().style.cursor = "pointer";
};

export const handleMouseOutDefaultCursor = (
  e: KonvaEventObject<MouseEvent>,
) => {
  e.target.getStage()!.container().style.cursor = "default";
};

export const handleDragEnd = <T extends BaseCanvasItem>(
  e: KonvaEventObject<DragEvent>,
  icon: T,
  setIconsOnCanvas: Dispatch<SetStateAction<T[]>>,
  deleteGroupRef?: RefObject<Konva.Group | null>,
  connectingLines?: ConnectingLine[],
  setConnectingLines?: Dispatch<SetStateAction<ConnectingLine[]>>,
  onDeleteConnected?: (connectedId: string) => void,
  onItemRemoved?: (id: string) => void,
  onItemMoved?: (item: T) => void,
  onDelete?: (item: T) => void,
) => {
  const node = e.target;
  const isOverDeleteGroup = node.getAttr("isOverDeleteGroup") as boolean;

  if (deleteGroupRef?.current) {
    deleteGroupRef.current.visible(!isMobileLayout());
    deleteGroupRef.current.opacity(0.5);
  }

  node.getStage()!.container().style.cursor = "default";
  node.setAttr("isOverDeleteGroup", false);

  if (isOverDeleteGroup) {
    if (connectingLines && setConnectingLines) {
      const connectedLine = connectingLines.find(
        (line) => line.fromId === icon.id || line.toId === icon.id,
      );

      if (connectedLine && onDeleteConnected) {
        const connectedId =
          connectedLine.fromId === icon.id
            ? connectedLine.toId
            : connectedLine.fromId;
        onDeleteConnected(connectedId);
        setConnectingLines((prev) =>
          prev.filter((line) => line.id !== connectedLine.id),
        );
      }
    }

    onDelete?.(icon);
    setIconsOnCanvas((prev) => prev.filter((item) => item.id !== icon.id));

    onItemRemoved?.(icon.id);
    return;
  }

  const newX = node.x();
  const newY = node.y();

  setIconsOnCanvas((prev) => {
    const index = prev.findIndex((item) => item.id === icon.id);
    if (index === -1) return prev;

    const copy = prev.slice();
    const [item] = copy.splice(index, 1);
    copy.push({ ...item, x: newX, y: newY });
    return copy;
  });

  onItemMoved?.({ ...icon, x: newX, y: newY } as T);
};

export const handleDragMove = (
  e: KonvaEventObject<DragEvent>,
  deleteGroupRef?: RefObject<Konva.Group | null>,
  nodeRef?: Konva.Node | null,
) => {
  if (!deleteGroupRef?.current) return;

  const group = e.target;
  const deleteGroup = deleteGroupRef.current;
  deleteGroup.visible(true);

  const deleteZone = {
    x: deleteGroup.x(),
    y: deleteGroup.y(),
    width: deleteGroup.width() * deleteGroup.scaleX(),
    height: deleteGroup.height() * deleteGroup.scaleY(),
  };

  const groupX = group.x();
  const groupY = group.y();

  let isOver: boolean;

  if (nodeRef) {
    const width = nodeRef.width();
    const height = nodeRef.height();

    isOver = !(
      groupX + width < deleteZone.x ||
      groupX > deleteZone.x + deleteZone.width ||
      groupY + height < deleteZone.y ||
      groupY > deleteZone.y + deleteZone.height
    );
  } else {
    const width = group.width() || 0;
    const height = group.height() || 0;

    const centerX = groupX + width / 2;
    const centerY = groupY + height / 2;

    isOver =
      centerX >= deleteZone.x &&
      centerX <= deleteZone.x + deleteZone.width &&
      centerY >= deleteZone.y &&
      centerY <= deleteZone.y + deleteZone.height;
  }

  deleteGroup.opacity(isOver ? 0.8 : 0.5);

  group.setAttr("isOverDeleteGroup", isOver);
};
