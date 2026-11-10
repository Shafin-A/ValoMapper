import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import type { SelectionDragController } from "@/hooks/canvas/use-canvas-selection-drag";
import { useTextEditor } from "@/hooks/canvas";
import { Group, Rect, Transformer } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import { TextEditor } from "@/components/canvas/text-editor";
import { RichText } from "@/components/canvas/rich-text";
import Konva from "konva";
import { RefObject, useCallback, useState } from "react";
import { handleDragEnd, handleDragMove } from "@/lib/utils";
import {
  TEXT_MIN_HEIGHT,
  TEXT_PLACEHOLDER_COLOR,
  layoutRichText,
  resolveTextFontSize,
  textSpansForItem,
} from "@/lib/rich-text";
import type { TextSpan } from "@/lib/types";

interface CanvasTextProps {
  stageRef: RefObject<Konva.Stage | null>;
  transformerRefs: RefObject<Map<string, Konva.Transformer>>;
  deleteGroupRef: RefObject<Konva.Group | null>;
  selectionDrag: SelectionDragController;
}

const EMPTY_PLACEHOLDER = "Click to add text...";

export const CanvasTexts = ({
  stageRef,
  transformerRefs,
  deleteGroupRef,
  selectionDrag,
}: CanvasTextProps) => {
  const {
    textsOnCanvas,
    isDrawMode,
    editingTextId,
    setTextsOnCanvas,
    setHoveredElementId,
    selectedCanvasIcon,
  } = useCanvas();

  const { notifyTextUpdated, notifyTextRemoved } = useCollaborativeCanvas();

  const [liveWidths, setLiveWidths] = useState<Record<string, number>>({});

  const {
    textRefs,
    attachTransformerToText,
    handleTextClick,
    handleTextTransform,
    handleTextTransformEnd,
    handleTextChange,
    handleTextEditComplete,
  } = useTextEditor(transformerRefs);

  const handleLiveTransform = useCallback(
    (textId: string, node: Konva.Rect) => {
      handleTextTransform(textId);

      const width = node.width();
      setLiveWidths((previous) =>
        previous[textId] === width
          ? previous
          : { ...previous, [textId]: width },
      );
    },
    [handleTextTransform],
  );

  const handleLiveTransformEnd = useCallback(
    (textId: string) => {
      handleTextTransformEnd(textId);

      setLiveWidths((previous) => {
        if (!(textId in previous)) return previous;
        const next = { ...previous };
        delete next[textId];
        return next;
      });
    },
    [handleTextTransformEnd],
  );

  return textsOnCanvas.map((textItem) => {
    const textNode = textRefs.current.get(textItem.id);
    const fontSize = resolveTextFontSize(textItem.fontSize);
    const spans = textSpansForItem(textItem);
    const hasText = spans.some((span) => span.text.length > 0);
    const layoutSpans: TextSpan[] = hasText
      ? spans
      : [{ text: EMPTY_PLACEHOLDER, color: TEXT_PLACEHOLDER_COLOR }];
    const boxWidth = liveWidths[textItem.id] ?? textItem.width;
    const layout = layoutRichText(layoutSpans, {
      width: boxWidth,
      fontSize,
    });
    const boxHeight = Math.max(TEXT_MIN_HEIGHT, layout.height);
    const isEditing = editingTextId === textItem.id;

    return (
      <Group
        key={textItem.id}
        id={textItem.id}
        draggable={!isDrawMode && !isEditing}
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
          !selectedCanvasIcon &&
          !editingTextId &&
          setHoveredElementId(textItem.id)
        }
        onMouseLeave={() =>
          !selectedCanvasIcon && !editingTextId && setHoveredElementId(null)
        }
        onDragMove={(e) => {
          handleDragMove(e, deleteGroupRef, textNode);
          selectionDrag.handleDragMove(e);
        }}
        onDragEnd={(e) => {
          if (selectionDrag.handleDragEnd(e)) return;

          handleDragEnd(
            e,
            textItem,
            setTextsOnCanvas,
            deleteGroupRef,
            undefined,
            undefined,
            undefined,
            notifyTextRemoved,
            notifyTextUpdated,
          );
        }}
      >
        <Group visible={!isEditing}>
          <Rect
            ref={(node) => {
              if (node) {
                textRefs.current.set(textItem.id, node);
                attachTransformerToText(node, textItem.id);
              } else {
                textRefs.current.delete(textItem.id);
              }
            }}
            width={boxWidth}
            height={boxHeight}
            fill="#18181b"
            cornerRadius={8}
            onTransform={(event) =>
              handleLiveTransform(textItem.id, event.target as Konva.Rect)
            }
            onTransformEnd={() => handleLiveTransformEnd(textItem.id)}
          />
          <RichText layout={layout} />
        </Group>
        {isEditing ? (
          <TextEditor
            key={textItem.id}
            spans={spans}
            fontSize={fontSize}
            width={boxWidth}
            height={boxHeight}
            onChange={(value) => handleTextChange(textItem.id, value)}
            onClose={handleTextEditComplete}
          />
        ) : !selectionDrag.isMultiSelected(textItem.id) ? (
          <Transformer
            ref={(node) => {
              if (node) {
                transformerRefs.current.set(textItem.id, node);
                const target = textRefs.current.get(textItem.id);
                if (target) {
                  node.nodes([target]);
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
            boundBoxFunc={(oldBox, newBox) => {
              // Prevent flipping
              if (newBox.x !== oldBox.x) {
                return oldBox;
              }

              return {
                ...newBox,
                width: Math.max(100, newBox.width),
              };
            }}
          />
        ) : null}
      </Group>
    );
  });
};
