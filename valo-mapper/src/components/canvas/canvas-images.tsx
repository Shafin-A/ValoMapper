import { useCanvas } from "@/contexts/canvas-context";
import { useImageTransform } from "@/hooks/use-image-transform";
import Konva from "konva";
import { RefObject } from "react";
import { Group, Image, Transformer } from "react-konva";

interface CanvasImageProps {
  stageRef: RefObject<Konva.Stage | null>;
  transformerRefs: RefObject<Map<string, Konva.Transformer>>;
}

export const CanvasImages = ({
  stageRef,
  transformerRefs,
}: CanvasImageProps) => {
  const { imagesOnCanvas, isDrawMode, editingTextId } = useCanvas();

  const {
    imageNodeRefs,
    imageLoaderRefs,
    hoveredImageId,
    handleImageMouseOver,
    handleImageDragEnd,
    handleImageTransform,
    handleImageTransformEnd,
  } = useImageTransform();

  return imagesOnCanvas.map((imageItem) => (
    <Group
      key={imageItem.id}
      id={imageItem.id}
      draggable={!isDrawMode}
      x={imageItem.x}
      y={imageItem.y}
      onDragEnd={(e) => handleImageDragEnd(imageItem.id, e)}
      onMouseEnter={() => handleImageMouseOver(imageItem.id)}
      onMouseLeave={() => handleImageMouseOver(null)}
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
        image={imageLoaderRefs.current.get(imageItem.id)}
        width={imageItem.width}
        height={imageItem.height}
        onTransform={() => handleImageTransform(imageItem.id)}
        onTransformEnd={() => handleImageTransformEnd(imageItem.id)}
      />
      {hoveredImageId === imageItem.id && !isDrawMode && !editingTextId && (
        <Transformer
          ref={(node) => {
            if (node) {
              transformerRefs.current.set(imageItem.id, node);
              if (imageNodeRefs.current.get(imageItem.id)) {
                node.nodes([imageNodeRefs.current.get(imageItem.id)!]);
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
  ));
};
