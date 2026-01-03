import { useCanvas } from "@/contexts/canvas-context";
import { useTextEditor } from "@/hooks/canvas";
import { Group, Rect, Text, Transformer } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import { TextEditor } from "@/components/canvas/text-editor";
import Konva from "konva";
import { RefObject } from "react";
import { handleDragEnd, handleDragMove } from "@/lib/utils";

interface CanvasTextProps {
  stageRef: RefObject<Konva.Stage | null>;
  transformerRefs: RefObject<Map<string, Konva.Transformer>>;
  deleteGroupRef: RefObject<Konva.Group | null>;
}

export const CanvasTexts = ({
  stageRef,
  transformerRefs,
  deleteGroupRef,
}: CanvasTextProps) => {
  const {
    textsOnCanvas,
    isDrawMode,
    editingTextId,
    setTextsOnCanvas,
    setHoveredElementId,
    selectedCanvasIcon,
  } = useCanvas();

  const {
    textRefs,
    attachTransformerToText,
    handleTextClick,
    handleTextTransform,
    handleTextTransformEnd,
    handleTextChange,
    handleTextEditComplete,
  } = useTextEditor(transformerRefs);

  return textsOnCanvas.map((textItem) => {
    const textNode = textRefs.current.get(textItem.id);

    return (
      <Group
        key={textItem.id}
        id={textItem.id}
        draggable={!isDrawMode && editingTextId !== textItem.id}
        x={textItem.x}
        y={textItem.y}
        onTap={() => handleTextClick(textItem.id)}
        onClick={(e: KonvaEventObject<MouseEvent>) => {
          // Only handle left clicks
          if (e.evt.button === 0) {
            handleTextClick(textItem.id);
          }
        }}
        onMouseEnter={() =>
          !selectedCanvasIcon && setHoveredElementId(textItem.id)
        }
        onMouseLeave={() => !selectedCanvasIcon && setHoveredElementId(null)}
        onDragMove={(e) => handleDragMove(e, deleteGroupRef, textNode)}
        onDragEnd={(e) =>
          handleDragEnd(e, textItem, setTextsOnCanvas, deleteGroupRef)
        }
      >
        <Rect width={textItem.width} height={Math.max(60, textItem.height)} />
        <Text
          ref={(node) => {
            if (node) {
              textRefs.current.set(textItem.id, node);
              attachTransformerToText(node, textItem.id);
            } else {
              textRefs.current.delete(textItem.id);
            }
          }}
          onTransform={() => handleTextTransform(textItem.id)}
          onTransformEnd={() => handleTextTransformEnd(textItem.id)}
          text={textItem.text || "Click to add text..."}
          fontSize={18}
          padding={10}
          width={textItem.width}
          visible={editingTextId !== textItem.id}
          fill={textItem.text ? "#ffffff" : "#52525b"}
          sceneFunc={function (context, shape) {
            context.fillStyle = "#18181b";
            const radius = 8;
            context.beginPath();
            context.roundRect(
              0,
              0,
              shape.width(),
              Math.max(60, shape.height()),
              radius
            );
            context.closePath();
            context.fill();
            (shape as Konva.Text)._sceneFunc(context);
          }}
        />
        {editingTextId === textItem.id ? (
          <TextEditor
            textNode={textNode!}
            text={textItem.text || ""}
            onChange={(value) => handleTextChange(textItem.id, value)}
            onClose={handleTextEditComplete}
          />
        ) : (
          <Transformer
            ref={(node) => {
              if (node) {
                transformerRefs.current.set(textItem.id, node);
                if (textNode) {
                  node.nodes([textNode]);
                  node.getLayer()?.batchDraw();
                }
              } else {
                transformerRefs.current.delete(textItem.id);
              }
            }}
            enabledAnchors={["middle-right"]}
            rotateEnabled={false}
            borderEnabled={false}
            anchorFill="#27272a"
            anchorStroke="#18181b"
            anchorStyleFunc={(anchor) => {
              if (anchor.hasName("middle-right")) {
                const currentTransformer =
                  anchor.getParent() as Konva.Transformer;
                if (currentTransformer) {
                  const h = currentTransformer.height();
                  const scale = stageRef.current?.scaleX() ?? 1;
                  anchor.cornerRadius(10 * scale);
                  anchor.width(10 * scale);
                  anchor.height(Math.max(50 * scale, h - 10));
                  anchor.offsetX((10 * scale) / 2);
                  anchor.offsetY((h - 10 * scale) / 2);
                }
              }
            }}
            boundBoxFunc={(_, newBox) => ({
              ...newBox,
              width: Math.max(100, newBox.width),
            })}
          />
        )}
      </Group>
    );
  });
};
