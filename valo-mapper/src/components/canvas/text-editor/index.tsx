import { Html } from "react-konva-utils";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import {
  DEFAULT_TEXT_COLOR,
  TEXT_FONT_FAMILY,
  TEXT_FONT_SIZE_OPTIONS,
  TEXT_LINE_HEIGHT,
  TEXT_MIN_HEIGHT,
  TEXT_PADDING,
  TEXT_PLACEHOLDER_COLOR,
  layoutRichText,
  normalizeTextColor,
  parseListMarker,
  readSpansFromDom,
  resolveTextFontSize,
  spansToEditorHtml,
  spansToPlainText,
} from "@/lib/rich-text";
import type { TextSpan } from "@/lib/types";
import {
  findLineIndex,
  getLineInfos,
  getSelectionTextOffsets,
} from "./editor-dom";
import {
  EMPTY_FORMATS,
  readCurrentFormats,
  replaceEditorContent as replaceEditorContentIn,
  restorePendingFormats as restorePendingFormatsIn,
  type ActiveFormats,
} from "./formatting";
import { TextEditorToolbar } from "./toolbar";
import {
  useEditorFocus,
  useFontSizeFocusSync,
  useOutsidePointerClose,
  useSelectionTracking,
  useToolbarPlacement,
} from "./use-editor-lifecycle";
import { useEditorKeyboard } from "./use-editor-keyboard";
import { useListEditing } from "./use-list-editing";

interface TextEditorProps {
  spans: TextSpan[];
  fontSize: number;
  width: number;
  height: number;
  onChange: (value: { spans: TextSpan[]; fontSize: number }) => void;
  onClose: () => void;
  mobile?: boolean;
}

export const TextEditor = ({
  spans,
  fontSize,
  width,
  height,
  onChange,
  onClose,
  mobile,
}: TextEditorProps) => {
  const detectedMobile = useIsMobile();
  const isMobile = mobile ?? detectedMobile;
  const viewport = useVisualViewport();
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
    (nextSpans: TextSpan[], size: number) =>
      Math.max(
        TEXT_MIN_HEIGHT,
        layoutRichText(nextSpans, {
          width: initialWidthRef.current,
          fontSize: size,
        }).height,
      ),
    [],
  );

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

  const restorePendingFormats = useCallback(
    (desired: ActiveFormats, includeColor = true) => {
      restorePendingFormatsIn(editorRef.current, desired, includeColor);
    },
    [],
  );

  const replaceEditorContent = useCallback((html: string) => {
    replaceEditorContentIn(editorRef.current, html);
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
    if (isMobile) {
      range.selectNodeContents(editor);
      range.collapse(false);
    } else {
      range.selectNodeContents(editor);
    }

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    return document.activeElement === editor;
  }, [isMobile]);

  useEditorFocus(focusEditor);

  useOutsidePointerClose({
    containerRef,
    editorRef,
    didInitRef,
    dirtyRef,
    spansRef,
    editorFontSizeRef,
    onChangeRef,
    onCloseRef,
  });

  useToolbarPlacement({
    containerRef,
    toolbarRef,
    initialWidthRef,
    setToolbarBelow,
    setToolbarOffsetX,
  });

  useFontSizeFocusSync(editorFontSize, restoreSelection);
  useSelectionTracking(saveSelection, updateActiveFormats);

  const { toggleList } = useListEditing({
    editorRef,
    editorFontSizeRef,
    readCurrentFormats,
    restorePendingFormats,
    replaceEditorContent,
    syncFromEditor,
    saveSelection,
  });

  const { handleKeyDown, handlePaste } = useEditorKeyboard({
    editorRef,
    editorFontSizeRef,
    syncFromEditor,
    commit,
    onCloseRef,
    readCurrentFormats,
    restorePendingFormats,
    replaceEditorContent,
    submitOnEnter: !isMobile,
  });

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

  const mobileDisplayFontSize = Math.max(editorFontSize, 16);

  const mobileOverlayStyle: CSSProperties = {
    position: "fixed",
    top: viewport.top,
    left: 0,
    width: "100%",
    height: viewport.height > 0 ? viewport.height : "100dvh",
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#0c0a09",
  };

  const mobileEditorStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    minHeight: "45vh",
    boxSizing: "border-box",
    padding: `${TEXT_PADDING + 6}px`,
    margin: 0,
    border: "none",
    outline: "none",
    background: "none",
    resize: "none",
    fontSize: `${mobileDisplayFontSize}px`,
    fontFamily: `${TEXT_FONT_FAMILY}, sans-serif`,
    lineHeight: 1.5,
    color: DEFAULT_TEXT_COLOR,
    caretColor: DEFAULT_TEXT_COLOR,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    overflowY: "auto",
  };

  const mobileToolbarStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    gap: "4px",
    width: "100%",
    padding: "8px 12px",
    paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
    borderTop: "1px solid #3f3f46",
    backgroundColor: "#18181b",
    overflowX: "auto",
    overflowY: "hidden",
    whiteSpace: "nowrap",
    zIndex: 2,
  };

  if (isMobile && typeof document !== "undefined") {
    return createPortal(
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit text"
        style={mobileOverlayStyle}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Edit text</p>
            <p className="text-xs text-zinc-400">
              Tap Done when you&apos;re finished
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={commit}>
            <Check className="size-4" />
            Done
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div
            className="relative min-h-[45vh] rounded-lg border border-zinc-800 bg-[#18181b]"
            onMouseDown={stopPropagation}
          >
            <div
              ref={attachEditor}
              role="textbox"
              aria-label="Text content"
              aria-multiline="true"
              contentEditable
              suppressContentEditableWarning
              style={mobileEditorStyle}
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
                  left: TEXT_PADDING + 6,
                  top: TEXT_PADDING + 6,
                  color: TEXT_PLACEHOLDER_COLOR,
                  fontSize: mobileDisplayFontSize,
                  fontFamily: `${TEXT_FONT_FAMILY}, sans-serif`,
                  lineHeight: 1.5,
                }}
              >
                Type your text...
              </span>
            )}
          </div>
        </div>

        <TextEditorToolbar
          mobile
          toolbarRef={toolbarRef}
          style={mobileToolbarStyle}
          activeFormats={activeFormats}
          fontSize={editorFontSize}
          sizeOptions={sizeOptions}
          onCommand={applyCommand}
          onColor={applyColor}
          onToggleList={toggleList}
          onFontSizeChange={handleFontSizeChange}
          onMouseDown={stopPropagation}
        />
      </div>,
      document.body,
    );
  }

  return (
    <Html>
      <div
        ref={containerRef}
        style={containerStyle}
        onMouseDown={stopPropagation}
        onClick={(event) => event.stopPropagation()}
      >
        <TextEditorToolbar
          toolbarRef={toolbarRef}
          style={toolbarStyle}
          activeFormats={activeFormats}
          fontSize={editorFontSize}
          sizeOptions={sizeOptions}
          onCommand={applyCommand}
          onColor={applyColor}
          onToggleList={toggleList}
          onFontSizeChange={handleFontSizeChange}
          onMouseDown={stopPropagation}
        />

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
