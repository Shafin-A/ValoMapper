import type { RefObject } from "react";
import type {
  ClipboardEvent as ReactClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  joinSpansLines,
  normalizeTextSpans,
  parseListMarker,
  readSpansFromDom,
  removeListMarker,
  spansToEditorHtml,
  spansToPlainText,
  splitSpansAt,
  splitSpansIntoLines,
  textStyleOfSpan,
} from "@/lib/rich-text";
import {
  findLineIndex,
  getLineInfos,
  getSelectionTextOffsets,
  setCaretInContentSpan,
  setSelectionByOffsets,
} from "./editor-dom";
import type { ActiveFormats } from "./formatting";

interface UseEditorKeyboardOptions {
  editorRef: RefObject<HTMLDivElement | null>;
  editorFontSizeRef: { current: number };
  syncFromEditor: () => void;
  commit: () => void;
  onCloseRef: { current: () => void };
  readCurrentFormats: () => ActiveFormats;
  restorePendingFormats: (desired: ActiveFormats) => void;
  replaceEditorContent: (html: string) => void;
  submitOnEnter?: boolean;
}

export const useEditorKeyboard = ({
  editorRef,
  editorFontSizeRef,
  syncFromEditor,
  commit,
  onCloseRef,
  readCurrentFormats,
  restorePendingFormats,
  replaceEditorContent,
  submitOnEnter = true,
}: UseEditorKeyboardOptions) => {
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      if (event.shiftKey) {
        window.setTimeout(syncFromEditor, 0);
        return;
      }

      const editor = editorRef.current;
      const offsets = editor ? getSelectionTextOffsets(editor) : null;

      if (editor && offsets) {
        const editorSpans = readSpansFromDom(editor, {
          trimTrailingNewlines: false,
        });
        const text = spansToPlainText(editorSpans);
        const lines = getLineInfos(text);
        const lineIndex = findLineIndex(lines, offsets.start);
        const line = lines[lineIndex];
        const marker = line ? parseListMarker(line.text) : null;

        if (marker) {
          event.preventDefault();
          event.stopPropagation();

          if (line.text.slice(marker.contentStart).trim().length === 0) {
            const pendingFormats = readCurrentFormats();
            const lineSpans = splitSpansIntoLines(editorSpans);
            if (lineSpans[lineIndex]) {
              lineSpans[lineIndex] = removeListMarker(lineSpans[lineIndex]);
            }

            const nextSpans = joinSpansLines(lineSpans);
            replaceEditorContent(
              spansToEditorHtml(nextSpans, {
                fontSize: editorFontSizeRef.current,
              }),
            );

            const nextLineInfos = getLineInfos(spansToPlainText(nextSpans));
            const nextLine =
              nextLineInfos[Math.min(lineIndex, nextLineInfos.length - 1)];
            const leading = nextLine.text.match(/^\s*/)?.[0].length ?? 0;
            const caret = nextLine.start + leading;

            setSelectionByOffsets(editor, caret, caret);
            restorePendingFormats(pendingFormats);
            syncFromEditor();
            return;
          }

          const pendingFormats = readCurrentFormats();
          const punctuation = marker.token.endsWith(")") ? ")" : ".";
          const nextToken =
            marker.type === "number"
              ? `${(marker.number ?? 1) + 1}${punctuation} `
              : "• ";

          const lineSpans = splitSpansIntoLines(editorSpans);
          const currentLineSpans = lineSpans[lineIndex] ?? [];
          const caretInLine = Math.max(
            marker.contentStart,
            Math.min(offsets.start - line.start, line.text.length),
          );
          const [beforeSpans, afterSpans] = splitSpansAt(
            currentLineSpans,
            caretInLine,
          );
          const markerStyle = textStyleOfSpan(
            afterSpans[0] ?? currentLineSpans[currentLineSpans.length - 1],
          );
          const markerText = `${marker.leading}${nextToken}`;
          const newLineSpans = normalizeTextSpans([
            { text: markerText, ...markerStyle },
            ...afterSpans,
          ]);

          const nextLines = [...lineSpans];
          nextLines[lineIndex] = beforeSpans;
          nextLines.splice(lineIndex + 1, 0, newLineSpans);

          const nextSpans = joinSpansLines(nextLines);
          replaceEditorContent(
            spansToEditorHtml(nextSpans, {
              fontSize: editorFontSizeRef.current,
            }),
          );

          const nextLineInfos = getLineInfos(spansToPlainText(nextSpans));
          const newLine =
            nextLineInfos[Math.min(lineIndex + 1, nextLineInfos.length - 1)];
          const caret = newLine.start + markerText.length;

          if (!setCaretInContentSpan(editor, lineIndex + 1, 0)) {
            setSelectionByOffsets(editor, caret, caret);
          }
          restorePendingFormats(pendingFormats);
          syncFromEditor();
          return;
        }
      }

      if (!submitOnEnter) {
        window.setTimeout(syncFromEditor, 0);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      commit();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    }
  };

  // Paste as plain text so arbitrary HTML cannot leak into the stored spans.
  const handlePaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    if (typeof document.execCommand !== "function") return;

    const text = event.clipboardData?.getData("text/plain");
    if (!text) return;

    event.preventDefault();

    try {
      document.execCommand("insertText", false, text);
    } catch {
    }

    syncFromEditor();
  };

  return { handleKeyDown, handlePaste };
};
