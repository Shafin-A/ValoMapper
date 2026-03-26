import { Button } from "@/components/ui/button";
import { ALargeSmall } from "lucide-react";
import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { MAP_SIZE } from "@/lib/consts";
import { getNextId } from "@/lib/utils";
import { Vector2d } from "konva/lib/types";
import type { TextCanvas } from "@/lib/types";

interface TextAddButtonProps {
  mapPosition: Vector2d;
  onTextAdded?: (text: TextCanvas) => void;
  onBeforeAdd?: () => void;
  disabled?: boolean;
}

export const TextAddButton = ({
  mapPosition,
  onTextAdded,
  onBeforeAdd,
  disabled,
}: TextAddButtonProps) => {
  const { setTextsOnCanvas, setEditingTextId, setIsDrawMode } = useCanvas();

  const { notifyTextAdded } = useCollaborativeCanvas();

  const handleAddText = () => {
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
    notifyTextAdded(newText);
    onTextAdded?.(newText);
  };

  return (
    <Button
      variant="ghost"
      size="lg"
      onClick={handleAddText}
      disabled={disabled}
    >
      <ALargeSmall />
    </Button>
  );
};
