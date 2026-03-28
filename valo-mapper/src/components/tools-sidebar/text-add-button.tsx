import { Button } from "@/components/ui/button";
import { ALargeSmall } from "lucide-react";
import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { MAP_SIZE } from "@/lib/consts";
import { getNextId } from "@/lib/utils";
import { Vector2d } from "konva/lib/types";
import type { TextCanvas } from "@/lib/types";
import React, { useCallback } from "react";

interface TextAddButtonProps extends React.ComponentPropsWithoutRef<
  typeof Button
> {
  mapPosition: Vector2d;
  onTextAdded?: (text: TextCanvas) => void;
  onBeforeAdd?: () => void;
}

export const TextAddButton = React.forwardRef<
  HTMLButtonElement,
  TextAddButtonProps
>(({ mapPosition, onTextAdded, onBeforeAdd, onClick, ...props }, ref) => {
  const { setTextsOnCanvas, setEditingTextId, setIsDrawMode } = useCanvas();
  const { notifyTextAdded } = useCollaborativeCanvas();

  const handleAddText = useCallback(() => {
    onBeforeAdd?.();
    setEditingTextId(null);
    setIsDrawMode(false);

    const newText: TextCanvas = {
      id: getNextId("text"),
      text: "",
      x: mapPosition.x + MAP_SIZE / 2 + Math.round(Math.random() * 20),
      y: mapPosition.y + MAP_SIZE / 2 + Math.round(Math.random() * 20),
      width: 200,
      height: 60,
    };

    setTextsOnCanvas((prev) => [...prev, newText]);
    onTextAdded?.(newText);
    notifyTextAdded(newText);
  }, [
    mapPosition,
    onBeforeAdd,
    onTextAdded,
    setTextsOnCanvas,
    setEditingTextId,
    setIsDrawMode,
    notifyTextAdded,
  ]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        handleAddText();
      }
    },
    [onClick, handleAddText],
  );

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="lg"
      onClick={handleClick}
      {...props}
    >
      <ALargeSmall />
    </Button>
  );
});

TextAddButton.displayName = "TextAddButton";
