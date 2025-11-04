import { CanvasIcon } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import { handleDragEnd, handleDragMove } from "@/lib/utils";
import Konva from "konva";

interface CanvasToolIconsProps {
  deleteGroupRef: React.RefObject<Konva.Group | null>;
}

export const CanvasToolIcons = ({ deleteGroupRef }: CanvasToolIconsProps) => {
  const {
    toolIconsOnCanvas,
    setToolIconsOnCanvas,
    isDrawMode,
    registerNode,
    unregisterNode,
  } = useCanvas();

  return toolIconsOnCanvas.map((toolIcon) => (
    <CanvasIcon
      key={toolIcon.id}
      id={toolIcon.id}
      isAlly={true}
      x={toolIcon.x}
      y={toolIcon.y}
      src={`/tools/${toolIcon.name}.webp`}
      draggable={!isDrawMode}
      isListening={!isDrawMode}
      onDragMove={(e) => handleDragMove(e, deleteGroupRef)}
      onDragEnd={(e) =>
        handleDragEnd(e, toolIcon, setToolIconsOnCanvas, deleteGroupRef)
      }
      width={toolIcon.width}
      height={toolIcon.height}
      borderOpacity={0}
      strokeWidth={0}
      radius={0}
      fill=""
      allyColor={"#ffffff"}
      enemyColor={"#ffffff"}
      registerNode={registerNode}
      unregisterNode={unregisterNode}
    />
  ));
};
