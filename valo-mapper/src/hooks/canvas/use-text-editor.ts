import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import Konva from "konva";
import { RefObject, useCallback, useRef } from "react";

export const useTextEditor = (
  transformerRefs: RefObject<Map<string, Konva.Transformer>>,
) => {
  const { textsOnCanvas, setTextsOnCanvas, isDrawMode, setEditingTextId } =
    useCanvas();
  const { notifyTextUpdated } = useCollaborativeCanvas();

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
    [transformerRefs],
  );

  const handleTextClick = useCallback(
    (textId: string) => {
      if (isDrawMode) return;
      setEditingTextId(textId);
    },
    [isDrawMode, setEditingTextId],
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

      const textItem = textsOnCanvas.find((t) => t.id === textId);
      if (textItem) {
        const updatedText = {
          ...textItem,
          width: textNode.width(),
          height: textNode.height(),
        };
        setTextsOnCanvas((prev) =>
          prev.map((item) => (item.id === textId ? updatedText : item)),
        );
        notifyTextUpdated(updatedText);
      }
    },
    [setTextsOnCanvas, textsOnCanvas, notifyTextUpdated],
  );

  const handleTextChange = (textId: string, newText: string) => {
    const textItem = textsOnCanvas.find((t) => t.id === textId);
    if (textItem) {
      const updatedText = { ...textItem, text: newText };
      setTextsOnCanvas((prev) =>
        prev.map((item) => (item.id === textId ? updatedText : item)),
      );
      notifyTextUpdated(updatedText);
    }
  };

  const handleTextEditComplete = useCallback(() => {
    setEditingTextId(null);
  }, [setEditingTextId]);

  return {
    textRefs,
    handleTextClick,
    handleTextChange,
    handleTextEditComplete,
    attachTransformerToText,
    handleTextTransform,
    handleTextTransformEnd,
  };
};
