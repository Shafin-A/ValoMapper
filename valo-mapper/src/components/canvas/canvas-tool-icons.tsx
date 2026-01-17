import { CanvasIcon } from "@/components/canvas-icons";
import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { handleDragEnd, handleDragMove } from "@/lib/utils";
import Konva from "konva";
import { Group } from "react-konva";

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
    setHoveredElementId,
    selectedCanvasIcon,
  } = useCanvas();

  const { notifyToolIconMoved, notifyToolIconRemoved } =
    useCollaborativeCanvas();

  return toolIconsOnCanvas.map((toolIcon) => (
    <Group
      key={toolIcon.id}
      onMouseEnter={() =>
        !selectedCanvasIcon && setHoveredElementId(toolIcon.id)
      }
      onMouseLeave={() => !selectedCanvasIcon && setHoveredElementId(null)}
    >
      <CanvasIcon
        id={toolIcon.id}
        isAlly={true}
        x={toolIcon.x}
        y={toolIcon.y}
        src={`/tools/${toolIcon.name}.webp`}
        draggable={!isDrawMode}
        isListening={!isDrawMode}
        onDragMove={(e) => handleDragMove(e, deleteGroupRef)}
        onDragEnd={(e) => {
          handleDragEnd(
            e,
            toolIcon,
            setToolIconsOnCanvas,
            deleteGroupRef,
            undefined,
            undefined,
            undefined,
            notifyToolIconRemoved,
            notifyToolIconMoved
          );
        }}
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
    </Group>
  ));
};
