import { useCanvas } from "@/contexts/canvas-context";
import { useTextEditor } from "@/hooks/use-text-editor";
import { Group, Rect, Text, Transformer } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import { TextEditor } from "@/components/text-editor";
import Konva from "konva";
import { RefObject } from "react";

interface CanvasTextProps {
  stageRef: RefObject<Konva.Stage | null>;
  transformerRefs: RefObject<Map<string, Konva.Transformer>>;
}

export const CanvasTexts = ({ stageRef, transformerRefs }: CanvasTextProps) => {
  const { textsOnCanvas, isDrawMode, editingTextId } = useCanvas();

  const {
    textRefs,
    attachTransformerToText,
    handleTextClick,
    handleTextDragEnd,
    handleTextTransform,
    handleTextTransformEnd,
    handleTextChange,
    handleTextEditComplete,
  } = useTextEditor(transformerRefs);

  return textsOnCanvas.map((textItem) => (
    <Group
      key={textItem.id}
      id={textItem.id}
      draggable={!isDrawMode && editingTextId !== textItem.id}
      x={textItem.x}
      y={textItem.y}
      onClick={(e: KonvaEventObject<MouseEvent>) => {
        // Only handle left clicks
        if (e.evt.button === 0) {
          handleTextClick(textItem.id);
        }
      }}
      onDragEnd={(e) => handleTextDragEnd(textItem.id, e)}
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
          textNode={textRefs.current.get(textItem.id)!}
          text={textItem.text || ""}
          onChange={(value) => handleTextChange(textItem.id, value)}
          onClose={handleTextEditComplete}
        />
      ) : (
        <Transformer
          ref={(node) => {
            if (node) {
              transformerRefs.current.set(textItem.id, node);
              const textNode = textRefs.current.get(textItem.id);
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
              const transformer = transformerRefs.current.get(textItem.id);
              if (transformer) {
                const h = transformer.height();
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
  ));
};
