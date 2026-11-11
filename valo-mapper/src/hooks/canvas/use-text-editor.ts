import {
  useCanvasEntities,
  useCanvasUi,
} from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import Konva from "konva";
import { RefObject, useCallback, useRef } from "react";
import {
  TEXT_MIN_HEIGHT,
  layoutRichText,
  normalizeTextSpans,
  renumberListLines,
  resolveTextFontSize,
  spansHaveFormatting,
  spansToPlainText,
  textSpansForItem,
} from "@/lib/rich-text";
import type { TextCanvas, TextSpan } from "@/lib/types";
import { shouldSuppressCanvasItemTap } from "@/lib/canvas-long-press";

export type TextChangeValue = {
  spans: TextSpan[];
  fontSize: number;
};

const heightForText = (
  textItem: TextCanvas,
  width: number,
  spans?: TextSpan[],
): number => {
  const layout = layoutRichText(spans ?? textSpansForItem(textItem), {
    width,
    fontSize: resolveTextFontSize(textItem.fontSize),
  });

  return Math.max(TEXT_MIN_HEIGHT, layout.height);
};

export const useTextEditing = () => {
  const { textsOnCanvas, setTextsOnCanvas } = useCanvasEntities();
  const { setEditingTextId } = useCanvasUi();
  const { notifyTextUpdated } = useCollaborativeCanvas();

  const handleTextChange = (textId: string, value: TextChangeValue) => {
    const textItem = textsOnCanvas.find((t) => t.id === textId);
    if (!textItem) return;

    const spans = renumberListLines(normalizeTextSpans(value.spans));
    const fontSize = resolveTextFontSize(value.fontSize);
    const updatedText: TextCanvas = {
      ...textItem,
      text: spansToPlainText(spans),
      spans: spansHaveFormatting(spans) ? spans : undefined,
      fontSize,
      height: heightForText({ ...textItem, fontSize }, textItem.width, spans),
    };

    setTextsOnCanvas((prev) =>
      prev.map((item) => (item.id === textId ? updatedText : item)),
    );
    notifyTextUpdated(updatedText);
  };

  const handleTextEditComplete = useCallback(() => {
    setEditingTextId(null);
  }, [setEditingTextId]);

  return { handleTextChange, handleTextEditComplete };
};

export const useTextEditor = (
  transformerRefs: RefObject<Map<string, Konva.Transformer>>,
) => {
  const { textsOnCanvas, setTextsOnCanvas } = useCanvasEntities();
  const { isDrawMode, setEditingTextId } = useCanvasUi();
  const { notifyTextUpdated } = useCollaborativeCanvas();
  const { handleTextChange, handleTextEditComplete } = useTextEditing();

  const textRefs = useRef<Map<string, Konva.Rect>>(new Map());

  const attachTransformerToText = useCallback(
    (textNode: Konva.Rect | null, transformerId: string) => {
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
      if (isDrawMode || shouldSuppressCanvasItemTap()) return;
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
        const width = textNode.width();
        const updatedText: TextCanvas = {
          ...textItem,
          width,
          height: heightForText({ ...textItem, width }, width),
        };
        setTextsOnCanvas((prev) =>
          prev.map((item) => (item.id === textId ? updatedText : item)),
        );
        notifyTextUpdated(updatedText);
      }
    },
    [setTextsOnCanvas, textsOnCanvas, notifyTextUpdated],
  );

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
