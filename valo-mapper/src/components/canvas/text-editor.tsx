import { Html } from "react-konva-utils";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClipboardEvent as ReactClipboardEvent,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { Bold, Italic, List, ListOrdered, Underline, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TEXT_COLOR,
  TEXT_FONT_FAMILY,
  TEXT_FONT_SIZE_OPTIONS,
  TEXT_LINE_HEIGHT,
  TEXT_MIN_HEIGHT,
  TEXT_PADDING,
  TEXT_PLACEHOLDER_COLOR,
  normalizeTextColor,
  readSpansFromDom,
  resolveTextFontSize,
  layoutRichText,
  applyListMarker,
  joinSpansLines,
  normalizeTextSpans,
  parseListMarker,
  removeListMarker,
  splitSpansAt,
  splitSpansIntoLines,
  spansToEditorHtml,
  spansToPlainText,
  textStyleOfSpan,
} from "@/lib/rich-text";
import type { TextSpan } from "@/lib/types";

interface TextEditorProps {
  spans: TextSpan[];
  fontSize: number;
  width: number;
  height: number;
  onChange: (value: { spans: TextSpan[]; fontSize: number }) => void;
  onClose: () => void;
}

type ActiveFormats = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  bullet: boolean;
  numbered: boolean;
  color: string;
};

const TEXT_COLORS = [
  "#ffffff",
  "#f87171",
  "#fbbf24",
  "#4ade80",
  "#38bdf8",
  "#c084fc",
  "#f472b6",
];

type LineInfo = { start: number; end: number; text: string };
type TextPosition = { node: Node; offset: number };

const getLineInfos = (text: string): LineInfo[] => {
  const lines: LineInfo[] = [];
  let start = 0;

  for (const line of text.split("\n")) {
    lines.push({ start, end: start + line.length, text: line });
    start += line.length + 1;
  }

  return lines;
};

const findLineIndex = (lines: LineInfo[], offset: number): number => {
  for (let index = 0; index < lines.length; index += 1) {
    if (offset <= lines[index].end) return index;
  }

  return lines.length - 1;
};

const measureTextOffset = (
  editor: HTMLDivElement,
  node: Node,
  offset: number,
): number => {
  const prefix = document.createRange();
  prefix.selectNodeContents(editor);
  prefix.setEnd(node, offset);

  const fragment = prefix.cloneContents();
  const container = document.createElement("div");
  container.appendChild(fragment);

  return spansToPlainText(
    readSpansFromDom(container, { trimTrailingNewlines: false }),
  ).length;
};

const getSelectionTextOffsets = (
  editor: HTMLDivElement,
): { start: number; end: number } | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  if (!selection.anchorNode || !editor.contains(selection.anchorNode)) {
    return null;
  }

  const range = selection.getRangeAt(0);

  return {
    start: measureTextOffset(editor, range.startContainer, range.startOffset),
    end: measureTextOffset(editor, range.endContainer, range.endOffset),
  };
};

const findTextPosition = (
  root: HTMLElement,
  target: number,
): TextPosition | null => {
  let remaining = target;
  let result: TextPosition | null = null;

  const visit = (node: Node): boolean => {
    if (node.nodeType === 3) {
      const text = node.nodeValue ?? "";
      const visibleLength = text.replace(/\u200b/g, "").length;

      if (remaining <= visibleLength) {
        if (remaining === 0) {
          result = { node, offset: 0 };
          return true;
        }

        let offset = 0;
        let visible = 0;

        while (offset < text.length) {
          if (text[offset] !== "\u200b") {
            if (visible === remaining) break;
            visible += 1;
          }
          offset += 1;
        }

        result = { node, offset };
        return true;
      }

      remaining -= visibleLength;
      return false;
    }

    if (node.nodeType !== 1) return false;

    const element = node as HTMLElement;

    if (element.tagName === "BR") {
      if (remaining === 0) {
        const parent = element.parentNode;
        if (parent) {
          result = {
            node: parent,
            offset: Array.prototype.indexOf.call(
              parent.childNodes,
              element,
            ) as number,
          };
          return true;
        }
      }

      remaining -= 1;
      return false;
    }

    for (const child of Array.from(element.childNodes)) {
      if (visit(child)) return true;
    }

    return false;
  };

  if (visit(root)) return result;
  return { node: root, offset: root.childNodes.length };
};

const setSelectionByOffsets = (
  editor: HTMLDivElement,
  start: number,
  end: number,
) => {
  const startPosition = findTextPosition(editor, start);
  const endPosition = findTextPosition(editor, end);
  if (!startPosition || !endPosition) return;

  editor.focus();

  const range = document.createRange();
  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};

const setCaretInContentSpan = (
  editor: HTMLDivElement,
  lineIndex: number,
  offset = 0,
): boolean => {
  const content = editor.querySelector<HTMLElement>(
    `[data-text-content-line="${lineIndex}"]`,
  );
  if (!content) return false;

  editor.focus();

  const range = document.createRange();
  let remaining = Math.max(0, offset);
  let position: TextPosition | null = null;

  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();

  while (textNode) {
    const length = textNode.nodeValue?.length ?? 0;

    if (remaining <= length) {
      position = { node: textNode, offset: remaining };
      break;
    }

    remaining -= length;
    textNode = walker.nextNode();
  }

  if (position) {
    let domOffset = position.offset;

    // Type after the zero-width placeholder so text lands in the content span.
    if (domOffset === 0 && position.node.nodeType === 3) {
      const value = position.node.nodeValue ?? "";
      let leading = 0;
      while (value[leading] === "\u200b") leading += 1;
      domOffset = leading;
    }

    range.setStart(position.node, domOffset);
    range.collapse(true);
  } else {
    range.selectNodeContents(content);
    range.collapse(false);
  }

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  return true;
};

const EMPTY_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  underline: false,
  bullet: false,
  numbered: false,
  color: DEFAULT_TEXT_COLOR,
};

export const TextEditor = ({
  spans,
  fontSize,
  width,
  height,
  onChange,
  onClose,
}: TextEditorProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const didInitRef = useRef(false);
  const dirtyRef = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);
  const spansRef = useRef<TextSpan[]>(spans);
  const initialSpansRef = useRef(spans);
  const initialFontSizeRef = useRef(resolveTextFontSize(fontSize));
  const initialHeightRef = useRef(Math.max(TEXT_MIN_HEIGHT, height));
  const initialWidthRef = useRef(width);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [editorFontSize, setEditorFontSize] = useState(
    initialFontSizeRef.current,
  );
  const [editorHeight, setEditorHeight] = useState(initialHeightRef.current);
  const [isEmpty, setIsEmpty] = useState(
    spansToPlainText(initialSpansRef.current).length === 0,
  );
  const [activeFormats, setActiveFormats] =
    useState<ActiveFormats>(EMPTY_FORMATS);
  const [toolbarBelow, setToolbarBelow] = useState(false);
  const [toolbarOffsetX, setToolbarOffsetX] = useState(0);

  const editorFontSizeRef = useRef(editorFontSize);
  editorFontSizeRef.current = editorFontSize;

  const activeFormatsRef = useRef(activeFormats);
  activeFormatsRef.current = activeFormats;

  const updateActiveFormats = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      !selection.anchorNode ||
      !editor.contains(selection.anchorNode)
    ) {
      return;
    }

    try {
      const queryState =
        typeof document.queryCommandState === "function"
          ? document.queryCommandState.bind(document)
          : null;
      const queryValue =
        typeof document.queryCommandValue === "function"
          ? document.queryCommandValue.bind(document)
          : null;

      let bullet = false;
      let numbered = false;
      const offsets = getSelectionTextOffsets(editor);

      if (offsets) {
        const text = spansToPlainText(
          readSpansFromDom(editor, { trimTrailingNewlines: false }),
        );
        const lines = getLineInfos(text);
        const line = lines[findLineIndex(lines, offsets.start)];
        const marker = line ? parseListMarker(line.text) : null;

        bullet = marker?.type === "bullet";
        numbered = marker?.type === "number";
      }

      setActiveFormats({
        bold: queryState?.("bold") ?? false,
        italic: queryState?.("italic") ?? false,
        underline: queryState?.("underline") ?? false,
        bullet,
        numbered,
        color:
          normalizeTextColor(queryValue?.("foreColor")) ?? DEFAULT_TEXT_COLOR,
      });
    } catch {
    }
  }, []);

  const measureEditorHeight = useCallback(
    (spans: TextSpan[], size: number) =>
      Math.max(
        TEXT_MIN_HEIGHT,
        layoutRichText(spans, {
          width: initialWidthRef.current,
          fontSize: size,
        }).height,
      ),
    [],
  );

  const readCurrentFormats = useCallback((): ActiveFormats => {
    const queryState =
      typeof document.queryCommandState === "function"
        ? document.queryCommandState.bind(document)
        : null;
    const queryValue =
      typeof document.queryCommandValue === "function"
        ? document.queryCommandValue.bind(document)
        : null;

    return {
      bold: queryState?.("bold") ?? false,
      italic: queryState?.("italic") ?? false,
      underline: queryState?.("underline") ?? false,
      bullet: false,
      numbered: false,
      color:
        normalizeTextColor(queryValue?.("foreColor")) ?? DEFAULT_TEXT_COLOR,
    };
  }, []);

  const restorePendingFormats = useCallback(
    (
      desired: ActiveFormats = activeFormatsRef.current,
      includeColor = true,
    ) => {
      const editor = editorRef.current;
      if (!editor) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
        return;
      }

      const queryState =
        typeof document.queryCommandState === "function"
          ? document.queryCommandState.bind(document)
          : null;
      if (!queryState) return;

      const ensure = (command: string, wanted: boolean) => {
        try {
          if (queryState(command) !== wanted) {
            document.execCommand(command, false);
          }
        } catch {
        }
      };

      ensure("bold", desired.bold);
      ensure("italic", desired.italic);
      ensure("underline", desired.underline);

      if (!includeColor) return;

      const queryValue =
        typeof document.queryCommandValue === "function"
          ? document.queryCommandValue.bind(document)
          : null;
      const currentColor =
        normalizeTextColor(queryValue?.("foreColor")) ?? DEFAULT_TEXT_COLOR;

      if (currentColor !== desired.color) {
        try {
          document.execCommand("styleWithCSS", false, "true");
          document.execCommand("foreColor", false, desired.color);
        } catch {
        }
      }
    },
    [],
  );

  // Use an editing command so the rewrite is undoable.
  const replaceEditorContent = useCallback((html: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const before = editor.innerHTML;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.focus();

    try {
      if (html) {
        document.execCommand("insertHTML", false, html);
      } else {
        document.execCommand("delete", false);
      }
    } catch {
    }

    if (editor.innerHTML === before && before !== html) {
      editor.innerHTML = html;
    }
  }, []);

  const syncFromEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextSpans = readSpansFromDom(editor, {
      trimTrailingNewlines: false,
    });
    dirtyRef.current = true;
    spansRef.current = nextSpans;
    setIsEmpty(spansToPlainText(nextSpans).length === 0);
    setEditorHeight(measureEditorHeight(nextSpans, editorFontSizeRef.current));
    updateActiveFormats();
  }, [measureEditorHeight, updateActiveFormats]);

  const saveSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) return;
    if (!selection.anchorNode || !editor.contains(selection.anchorNode)) {
      return;
    }

    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    const range = savedRangeRef.current;
    if (!range) return;

    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const applyCommand = useCallback(
    (command: string, value?: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      const selection = window.getSelection();
      const selectionInsideEditor = Boolean(
        selection &&
        selection.rangeCount > 0 &&
        selection.anchorNode &&
        editor.contains(selection.anchorNode),
      );

      // Restoring a range clears the pending typing style.
      if (!selectionInsideEditor || document.activeElement !== editor) {
        editor.focus();
        restoreSelection();
      }

      try {
        document.execCommand("styleWithCSS", false, "true");
        document.execCommand(command, false, value);
      } catch {
      }

      syncFromEditor();
      saveSelection();
    },
    [restoreSelection, saveSelection, syncFromEditor],
  );

  const applyColor = useCallback(
    (color: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      const selection = window.getSelection();
      const selectionInsideEditor = Boolean(
        selection &&
        selection.rangeCount > 0 &&
        selection.anchorNode &&
        editor.contains(selection.anchorNode),
      );
      const collapsed = selection?.isCollapsed ?? true;

      if (!selectionInsideEditor || document.activeElement !== editor) {
        editor.focus();
        restoreSelection();
      }

      if (collapsed) {
        restorePendingFormats(activeFormatsRef.current, false);
      }

      applyCommand("foreColor", color);
    },
    [applyCommand, restorePendingFormats, restoreSelection],
  );

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
      readCurrentFormats,
      replaceEditorContent,
      restorePendingFormats,
      saveSelection,
      syncFromEditor,
    ],
  );

  const handleFontSizeChange = useCallback(
    (nextSize: number) => {
      const size = resolveTextFontSize(nextSize);
      saveSelection();
      setEditorFontSize(size);

      const editor = editorRef.current;
      if (editor) {
        const currentSpans = readSpansFromDom(editor, {
          trimTrailingNewlines: false,
        });
        spansRef.current = currentSpans;
        setEditorHeight(measureEditorHeight(currentSpans, size));
      }
    },
    [measureEditorHeight, saveSelection],
  );

  const commit = useCallback(() => {
    const editor = editorRef.current;
    const nextSpans =
      didInitRef.current && editor && dirtyRef.current
        ? readSpansFromDom(editor)
        : spansRef.current;

    onChangeRef.current({
      spans: nextSpans,
      fontSize: editorFontSizeRef.current,
    });
    onCloseRef.current();
  }, []);

  const attachEditor = useCallback(
    (node: HTMLDivElement | null) => {
      editorRef.current = node;
      if (!node) return;

      if (!didInitRef.current) {
        node.innerHTML = spansToEditorHtml(initialSpansRef.current, {
          fontSize: initialFontSizeRef.current,
        });
        didInitRef.current = true;
        spansRef.current = initialSpansRef.current;
        setIsEmpty(spansToPlainText(initialSpansRef.current).length === 0);
        setEditorHeight(
          measureEditorHeight(
            initialSpansRef.current,
            initialFontSizeRef.current,
          ),
        );
      }
    },
    [measureEditorHeight],
  );

  const focusEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !editor.isConnected) return false;

    editor.focus();

    const range = document.createRange();
    range.selectNodeContents(editor);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    return document.activeElement === editor;
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    let attempts = 0;

    const tryFocus = () => {
      if (focusEditor() || attempts >= 20) return;
      attempts += 1;
      timer = window.setTimeout(tryFocus, 50);
    };

    tryFocus();

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [focusEditor]);

  useEffect(() => {
    const handleOutsidePointerDown = (event: globalThis.PointerEvent) => {
      const container = containerRef.current;
      if (
        container &&
        event.target instanceof Node &&
        container.contains(event.target)
      ) {
        return;
      }

      const currentEditor = editorRef.current;
      const nextSpans =
        didInitRef.current && currentEditor && dirtyRef.current
          ? readSpansFromDom(currentEditor)
          : spansRef.current;

      onChangeRef.current({
        spans: nextSpans,
        fontSize: editorFontSizeRef.current,
      });
      onCloseRef.current();
    };

    const clickTimer = window.setTimeout(() => {
      window.addEventListener("pointerdown", handleOutsidePointerDown, true);
    }, 100);

    return () => {
      window.removeEventListener("pointerdown", handleOutsidePointerDown, true);
      window.clearTimeout(clickTimer);
    };
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    let attempts = 0;

    const measure = () => {
      const container = containerRef.current;
      if (!container) {
        if (attempts < 20) {
          attempts += 1;
          timer = window.setTimeout(measure, 50);
        }
        return;
      }

      const viewport = container.closest<HTMLElement>(
        '[data-tour="map-canvas"]',
      );
      const viewportBounds = viewport?.getBoundingClientRect();
      const containerBounds = container.getBoundingClientRect();
      const scale =
        initialWidthRef.current > 0 && containerBounds.width > 0
          ? containerBounds.width / initialWidthRef.current
          : 1;
      const effectiveScale = scale > 0 ? scale : 1;
      const toolbarHeight = 44 * effectiveScale;

      if (
        viewportBounds &&
        containerBounds.top - toolbarHeight < viewportBounds.top
      ) {
        setToolbarBelow(true);
      }

      const toolbar = toolbarRef.current;
      if (viewportBounds && toolbar) {
        const toolbarWidth = toolbar.getBoundingClientRect().width;
        const overflow =
          containerBounds.left + toolbarWidth - viewportBounds.right + 8;

        if (overflow > 0) {
          setToolbarOffsetX(-overflow / effectiveScale);
        }
      }
    };

    measure();

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const isFirstFontSizeEffectRef = useRef(true);
  useEffect(() => {
    if (isFirstFontSizeEffectRef.current) {
      isFirstFontSizeEffectRef.current = false;
      return;
    }

    restoreSelection();
  }, [editorFontSize, restoreSelection]);

  useEffect(() => {
    const handleSelectionChange = () => {
      saveSelection();
      updateActiveFormats();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [saveSelection, updateActiveFormats]);

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

  const stopPropagation = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const sizeOptions = Array.from(
    new Set([...TEXT_FONT_SIZE_OPTIONS, editorFontSize]),
  ).sort((a, b) => a - b);

  const containerStyle: CSSProperties = {
    position: "relative",
    width: `${width}px`,
    height: `${editorHeight}px`,
    backgroundColor: "#18181b",
    borderRadius: "8px",
  };

  const editorStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    boxSizing: "border-box",
    width: "100%",
    height: "100%",
    padding: `${TEXT_PADDING}px`,
    margin: 0,
    border: "none",
    outline: "none",
    background: "none",
    overflow: "hidden",
    resize: "none",
    fontSize: `${editorFontSize}px`,
    fontFamily: `${TEXT_FONT_FAMILY}, sans-serif`,
    lineHeight: TEXT_LINE_HEIGHT,
    color: DEFAULT_TEXT_COLOR,
    caretColor: DEFAULT_TEXT_COLOR,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  };

  const toolbarStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    ...(toolbarBelow
      ? { top: "calc(100% + 8px)" }
      : { bottom: "calc(100% + 8px)" }),
    transform: `translateX(${toolbarOffsetX}px)`,
    display: "flex",
    alignItems: "center",
    gap: "2px",
    padding: "4px",
    borderRadius: "8px",
    border: "1px solid #3f3f46",
    backgroundColor: "#18181b",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
    zIndex: 2,
    whiteSpace: "nowrap",
  };

  const formatButtonClass = (active: boolean) =>
    cn(
      "h-6 w-6 rounded text-zinc-300 hover:bg-zinc-700 hover:text-white",
      active && "bg-zinc-700 text-white",
    );

  const formatButtonProps = (command: string, label: string) => ({
    type: "button" as const,
    variant: "ghost" as const,
    size: "icon" as const,
    "aria-label": label,
    onMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    onClick: () => applyCommand(command),
  });

  return (
    <Html>
      <div
        ref={containerRef}
        style={containerStyle}
        onMouseDown={stopPropagation}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          ref={toolbarRef}
          style={toolbarStyle}
          onMouseDown={stopPropagation}
        >
          <Button
            {...formatButtonProps("bold", "Bold")}
            aria-pressed={activeFormats.bold}
            className={formatButtonClass(activeFormats.bold)}
          >
            <Bold />
          </Button>
          <Button
            {...formatButtonProps("italic", "Italic")}
            aria-pressed={activeFormats.italic}
            className={formatButtonClass(activeFormats.italic)}
          >
            <Italic />
          </Button>
          <Button
            {...formatButtonProps("underline", "Underline")}
            aria-pressed={activeFormats.underline}
            className={formatButtonClass(activeFormats.underline)}
          >
            <Underline />
          </Button>

          <span className="mx-1 h-4 w-px bg-zinc-700" aria-hidden />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Bullet list"
            aria-pressed={activeFormats.bullet}
            className={formatButtonClass(activeFormats.bullet)}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={() => toggleList("bullet")}
          >
            <List />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Numbered list"
            aria-pressed={activeFormats.numbered}
            className={formatButtonClass(activeFormats.numbered)}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={() => toggleList("number")}
          >
            <ListOrdered />
          </Button>

          <span className="mx-1 h-4 w-px bg-zinc-700" aria-hidden />

          {TEXT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Text color ${color}`}
              aria-pressed={activeFormats.color === color}
              className={cn(
                "size-4 rounded-full border",
                activeFormats.color === color
                  ? "border-white"
                  : "border-zinc-600",
              )}
              style={{ backgroundColor: color }}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => applyColor(color)}
            />
          ))}

          <input
            type="color"
            aria-label="Custom text color"
            value={activeFormats.color}
            className="size-5 cursor-pointer rounded border-0 bg-transparent p-0"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => applyColor(event.target.value)}
          />

          <span className="mx-1 h-4 w-px bg-zinc-700" aria-hidden />

          <select
            aria-label="Font size"
            value={editorFontSize}
            className="h-6 rounded bg-zinc-800 px-1 text-[11px] text-white outline-none"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) =>
              handleFontSizeChange(Number(event.target.value))
            }
          >
            {sizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div
          ref={attachEditor}
          role="textbox"
          aria-label="Text content"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          style={editorStyle}
          onInput={syncFromEditor}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onPaste={handlePaste}
        />

        {isEmpty && (
          <span
            aria-hidden
            className="pointer-events-none absolute select-none"
            style={{
              left: TEXT_PADDING,
              top: TEXT_PADDING,
              color: TEXT_PLACEHOLDER_COLOR,
              fontSize: editorFontSize,
              fontFamily: `${TEXT_FONT_FAMILY}, sans-serif`,
              lineHeight: TEXT_LINE_HEIGHT,
            }}
          >
            Click to add text...
          </span>
        )}

        <Button
          type="button"
          variant="default"
          size="icon"
          className="absolute -top-2 -left-4 rounded-full size-6"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            commit();
          }}
        >
          <X />
          <span className="sr-only">Close</span>
        </Button>
      </div>
    </Html>
  );
};
