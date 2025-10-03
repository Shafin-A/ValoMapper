import { useCanvas } from "@/contexts/canvas-context";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { RefObject, useCallback, useRef } from "react";

export const useTextEditor = (
  transformerRefs: RefObject<Map<string, Konva.Transformer>>
) => {
  const {
    setTextsOnCanvas,
    isDrawMode,
    setEditingTextId,
    setAbilitiesOnCanvas,
  } = useCanvas();

  const textRefs = useRef<Map<string, Konva.Text>>(new Map());

  const attachTransformerToText = useCallback(
    (textNode: Konva.Text | null, transformerId: string) => {
      if (textNode) {
        const transformer = transformerRefs.current.get(transformerId);
        if (transformer) {
          transformer.nodes([textNode]);
          transformer.getLayer()?.batchDraw();
        }
      }
    },
    [transformerRefs]
  );

  const handleTextClick = useCallback(
    (textId: string) => {
      if (isDrawMode) return;
      setEditingTextId(textId);
      setAbilitiesOnCanvas([]);
    },
    [isDrawMode, setEditingTextId, setAbilitiesOnCanvas]
  );

  const handleTextTransform = useCallback((textId: string) => {
    const textNode = textRefs.current.get(textId);
    if (!textNode) return;

    const scaleX = textNode.scaleX();
    const newWidth = textNode.width() * scaleX;

    textNode.setAttrs({
      width: newWidth,
      scaleX: 1,
    });
  }, []);

  const handleTextTransformEnd = useCallback(
    (textId: string) => {
      const textNode = textRefs.current.get(textId);
      if (!textNode) return;

      setTextsOnCanvas((prev) =>
        prev.map((item) =>
          item.id === textId ? { ...item, width: textNode.width() } : item
        )
      );
    },
    [setTextsOnCanvas]
  );

  const handleTextChange = (textId: string, newText: string) => {
    setTextsOnCanvas((prev) =>
      prev.map((item) =>
        item.id === textId ? { ...item, text: newText } : item
      )
    );
  };

  const handleTextEditComplete = useCallback(() => {
    setEditingTextId(null);
  }, [setEditingTextId]);

  const handleTextDragEnd = useCallback(
    (textId: string, e: KonvaEventObject<DragEvent>) => {
      if (!e.target) return;
      const newX = e.target.x();
      const newY = e.target.y();

      setTextsOnCanvas((prev) =>
        prev.map((item) =>
          item.id === textId ? { ...item, x: newX, y: newY } : item
        )
      );
    },
    [setTextsOnCanvas]
  );

  return {
    textRefs,
    handleTextClick,
    handleTextChange,
    handleTextEditComplete,
    attachTransformerToText,
    handleTextTransform,
    handleTextTransformEnd,
    handleTextDragEnd,
  };
};
