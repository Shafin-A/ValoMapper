import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { useImageTransform } from "@/hooks/canvas";
import { handleDragEnd, handleDragMove } from "@/lib/utils";
import Konva from "konva";
import { RefObject } from "react";
import { Group, Image, Transformer } from "react-konva";

interface CanvasImageProps {
  stageRef: RefObject<Konva.Stage | null>;
  transformerRefs: RefObject<Map<string, Konva.Transformer>>;
  deleteGroupRef: RefObject<Konva.Group | null>;
  onImageDoubleClick?: (imageSrc: string) => void;
}

export const CanvasImages = ({
  stageRef,
  transformerRefs,
  deleteGroupRef,
  onImageDoubleClick,
}: CanvasImageProps) => {
  const {
    imagesOnCanvas,
    isDrawMode,
    editingTextId,
    setImagesOnCanvas,
    hoveredElementId,
    setHoveredElementId,
    selectedCanvasIcon,
  } = useCanvas();

  const { notifyImageMoved, notifyImageRemoved } = useCollaborativeCanvas();

  const {
    imageNodeRefs,
    imageLoaderRefs,
    hoveredImageId,
    handleImageMouseEnter: hookHandleImageMouseEnter,
    handleImageMouseLeave,
    handleImageTransformEnd,
  } = useImageTransform();

  const handleImageMouseEnter = (
    e: Konva.KonvaEventObject<MouseEvent>,
    imageId: string
  ) => {
    if (!selectedCanvasIcon) {
      hookHandleImageMouseEnter(e, imageId);
      setHoveredElementId(imageId);
    }
  };

  const handleImageMouseLeaveInternal = (
    e: Konva.KonvaEventObject<MouseEvent>
  ) => {
    handleImageMouseLeave(e);
    if (!selectedCanvasIcon) {
      setHoveredElementId(null);
    }
  };

  const handleImageClick = (imageId: string) => {
    if (!isDrawMode && !editingTextId) {
      setHoveredElementId((prev) => (prev === imageId ? null : imageId));
    }
  };

  const handleImageDoubleClick = (imageId: string) => {
    const imageLoader = imageLoaderRefs.current.get(imageId);
    if (imageLoader && onImageDoubleClick) {
      onImageDoubleClick(imageLoader.src);
    }
  };

  return imagesOnCanvas.map((imageItem) => {
    const imageNode = imageNodeRefs.current.get(imageItem.id);
    const imageLoader = imageLoaderRefs.current.get(imageItem.id);

    return (
      <Group
        key={imageItem.id}
        id={imageItem.id}
        draggable={!isDrawMode}
        x={imageItem.x}
        y={imageItem.y}
        onDragMove={(e) => handleDragMove(e, deleteGroupRef, imageNode)}
        onDragEnd={(e) => {
          handleDragEnd(
            e,
            imageItem,
            setImagesOnCanvas,
            deleteGroupRef,
            undefined,
            undefined,
            undefined,
            notifyImageRemoved,
            (movedItem) =>
              notifyImageMoved({
                id: movedItem.id,
                x: movedItem.x,
                y: movedItem.y,
                width: movedItem.width,
                height: movedItem.height,
              })
          );
        }}
        onMouseEnter={(e) => handleImageMouseEnter(e, imageItem.id)}
        onMouseLeave={(e) => handleImageMouseLeaveInternal(e)}
        onTap={() => handleImageClick(imageItem.id)}
        onClick={() => handleImageClick(imageItem.id)}
        onDblTap={() => handleImageDoubleClick(imageItem.id)}
        onDblClick={() => handleImageDoubleClick(imageItem.id)}
      >
        <Image
          alt="image"
          ref={(node) => {
            if (node) {
              imageNodeRefs.current.set(imageItem.id, node);
            } else {
              imageNodeRefs.current.delete(imageItem.id);
            }
          }}
          image={imageLoader}
          width={imageItem.width}
          height={imageItem.height}
          onTransformEnd={() => handleImageTransformEnd(imageItem.id)}
        />
        {(hoveredImageId === imageItem.id ||
          hoveredElementId === imageItem.id) &&
          !isDrawMode &&
          !editingTextId && (
            <Transformer
              ref={(node) => {
                if (node) {
                  transformerRefs.current.set(imageItem.id, node);
                  if (imageNode) {
                    node.nodes([imageNode]);
                  }
                } else {
                  transformerRefs.current.delete(imageItem.id);
                }
              }}
              boundBoxFunc={(_, newBox) => ({
                ...newBox,
                width: Math.max(5, newBox.width),
                height: Math.max(5, newBox.height),
              })}
              rotateEnabled={false}
              borderEnabled={false}
              enabledAnchors={["bottom-right"]}
              anchorSize={30}
              anchorStyleFunc={(anchor) => {
                const scale = stageRef.current?.scaleX() ?? 1;
                const size = anchor.getAttr("width") * scale;

                anchor
                  .fill("#52525b")
                  .stroke("#52525b")
                  .strokeWidth(1)
                  .sceneFunc((ctx, shape) => {
                    ctx.beginPath();
                    ctx.moveTo(size, 0);
                    ctx.lineTo(size, size);
                    ctx.lineTo(0, size);
                    ctx.closePath();
                    ctx.fillStrokeShape(shape);
                  });

                anchor.offsetX(30 * scale);
                anchor.offsetY(30 * scale);
              }}
            />
          )}
      </Group>
    );
  });
};
