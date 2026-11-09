import { useCallback } from "react";
import type { RefObject } from "react";
import {
  applyListMarker,
  joinSpansLines,
  parseListMarker,
  readSpansFromDom,
  removeListMarker,
  spansToEditorHtml,
  spansToPlainText,
  splitSpansIntoLines,
} from "@/lib/rich-text";
import {
  findLineIndex,
  getLineInfos,
  getSelectionTextOffsets,
  setCaretInContentSpan,
  setSelectionByOffsets,
} from "./editor-dom";
import type { ActiveFormats } from "./formatting";

interface UseListEditingOptions {
  editorRef: RefObject<HTMLDivElement | null>;
  editorFontSizeRef: { current: number };
  readCurrentFormats: () => ActiveFormats;
  restorePendingFormats: (desired: ActiveFormats) => void;
  replaceEditorContent: (html: string) => void;
  syncFromEditor: () => void;
  saveSelection: () => void;
}

export const useListEditing = ({
  editorRef,
  editorFontSizeRef,
  readCurrentFormats,
  restorePendingFormats,
  replaceEditorContent,
  syncFromEditor,
  saveSelection,
}: UseListEditingOptions) => {
  const toggleList = useCallback(
    (type: "bullet" | "number") => {
      const editor = editorRef.current;
      if (!editor) return;

      const pendingFormats = readCurrentFormats();
      const spans = readSpansFromDom(editor, {
        trimTrailingNewlines: false,
      });
      const text = spansToPlainText(spans);
      const lines = getLineInfos(text);
      const selection = getSelectionTextOffsets(editor);
      if (!selection) return;

      const start = Math.min(selection.start, text.length);
      const end = Math.min(selection.end, text.length);
      const wasCollapsed = start === end;
      const firstLine = findLineIndex(lines, start);
      const lastLine = wasCollapsed
        ? firstLine
        : findLineIndex(lines, Math.max(start, end - 1));

      const targetIndices: number[] = [];
      for (let index = firstLine; index <= lastLine; index += 1) {
        const line = lines[index];
        if (!line) continue;

        const isCollapsedCurrentLine = wasCollapsed && index === firstLine;
        if (isCollapsedCurrentLine || line.text.trim().length) {
          targetIndices.push(index);
        }
      }

      if (targetIndices.length === 0) return;

      const targetSet = new Set(targetIndices);
      const allMatch = targetIndices.every(
        (index) => parseListMarker(lines[index].text)?.type === type,
      );
      const lineSpans = splitSpansIntoLines(spans);

      const nextLines = lineSpans.map((lineSpansForLine, index) => {
        if (!targetSet.has(index)) return lineSpansForLine;
        if (allMatch) return removeListMarker(lineSpansForLine);

        const number = type === "number" ? targetIndices.indexOf(index) + 1 : 1;
        return applyListMarker(lineSpansForLine, type, number);
      });

      const nextSpans = joinSpansLines(nextLines);
      replaceEditorContent(
        spansToEditorHtml(nextSpans, {
          fontSize: editorFontSizeRef.current,
        }),
      );

      const nextLineInfos = getLineInfos(spansToPlainText(nextSpans));

      if (wasCollapsed) {
        const oldLine = lines[firstLine];
        const oldMarker = parseListMarker(oldLine.text);
        const oldLeading = oldLine.text.match(/^\s*/)?.[0].length ?? 0;
        const oldContentStart = oldMarker?.contentStart ?? oldLeading;
        const caretInLine = Math.max(
          0,
          Math.min(start - oldLine.start, oldLine.text.length),
        );

        const nextLine =
          nextLineInfos[Math.min(firstLine, nextLineInfos.length - 1)];
        const nextMarker = parseListMarker(nextLine.text);
        const nextLeading = nextLine.text.match(/^\s*/)?.[0].length ?? 0;
        const nextContentStart = nextMarker?.contentStart ?? nextLeading;
        const delta = nextContentStart - oldContentStart;
        const nextCaretInLine =
          caretInLine >= oldContentStart ? caretInLine + delta : caretInLine;
        const caret = Math.max(
          0,
          Math.min(nextCaretInLine, nextLine.text.length),
        );

        const contentOffset = Math.max(0, caret - nextContentStart);
        if (
          !nextMarker ||
          !setCaretInContentSpan(editor, firstLine, contentOffset)
        ) {
          setSelectionByOffsets(
            editor,
            nextLine.start + caret,
            nextLine.start + caret,
          );
        }
        restorePendingFormats(pendingFormats);
      } else {
        const startLine =
          nextLineInfos[Math.min(firstLine, nextLineInfos.length - 1)];
        const endLine =
          nextLineInfos[Math.min(lastLine, nextLineInfos.length - 1)];
        setSelectionByOffsets(editor, startLine.start, endLine.end);
      }

      syncFromEditor();
      saveSelection();
    },
    [
      editorRef,
      editorFontSizeRef,
      readCurrentFormats,
      restorePendingFormats,
      replaceEditorContent,
      syncFromEditor,
      saveSelection,
    ],
  );

  return { toggleList };
};
