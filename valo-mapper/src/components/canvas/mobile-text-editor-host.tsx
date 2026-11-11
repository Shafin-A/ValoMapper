"use client";

import { TextEditor } from "@/components/canvas/text-editor";
import { useCanvasEntities, useCanvasUi } from "@/contexts/canvas-context";
import { useTextEditing } from "@/hooks/canvas/use-text-editor";
import { useIsMobile } from "@/hooks/use-mobile";
import { resolveTextFontSize, textSpansForItem } from "@/lib/rich-text";

export const MobileTextEditorHost = () => {
  const isMobile = useIsMobile();
  const { textsOnCanvas } = useCanvasEntities();
  const { editingTextId } = useCanvasUi();
  const { handleTextChange, handleTextEditComplete } = useTextEditing();

  if (!isMobile || !editingTextId) {
    return null;
  }

  const textItem = textsOnCanvas.find((item) => item.id === editingTextId);
  if (!textItem) {
    return null;
  }

  return (
    <TextEditor
      key={textItem.id}
      mobile
      spans={textSpansForItem(textItem)}
      fontSize={resolveTextFontSize(textItem.fontSize)}
      width={textItem.width}
      height={textItem.height}
      onChange={(value) => handleTextChange(textItem.id, value)}
      onClose={handleTextEditComplete}
    />
  );
};
