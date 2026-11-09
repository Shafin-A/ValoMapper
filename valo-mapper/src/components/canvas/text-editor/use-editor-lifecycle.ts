import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { readSpansFromDom } from "@/lib/rich-text";
import type { TextSpan } from "@/lib/types";

type ValueRef<T> = { current: T };

export const useEditorFocus = (focusEditor: () => boolean) => {
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
};

export const useOutsidePointerClose = ({
  containerRef,
  editorRef,
  didInitRef,
  dirtyRef,
  spansRef,
  editorFontSizeRef,
  onChangeRef,
  onCloseRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  editorRef: RefObject<HTMLDivElement | null>;
  didInitRef: ValueRef<boolean>;
  dirtyRef: ValueRef<boolean>;
  spansRef: ValueRef<TextSpan[]>;
  editorFontSizeRef: ValueRef<number>;
  onChangeRef: ValueRef<
    (value: { spans: TextSpan[]; fontSize: number }) => void
  >;
  onCloseRef: ValueRef<() => void>;
}) => {
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
  }, [
    containerRef,
    didInitRef,
    dirtyRef,
    editorFontSizeRef,
    editorRef,
    onChangeRef,
    onCloseRef,
    spansRef,
  ]);
};

export const useToolbarPlacement = ({
  containerRef,
  toolbarRef,
  initialWidthRef,
  setToolbarBelow,
  setToolbarOffsetX,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  toolbarRef: RefObject<HTMLDivElement | null>;
  initialWidthRef: ValueRef<number>;
  setToolbarBelow: (value: boolean) => void;
  setToolbarOffsetX: (value: number) => void;
}) => {
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
  }, [
    containerRef,
    initialWidthRef,
    setToolbarBelow,
    setToolbarOffsetX,
    toolbarRef,
  ]);
};

export const useFontSizeFocusSync = (
  editorFontSize: number,
  restoreSelection: () => void,
) => {
  const isFirstRef = useRef(true);

  useEffect(() => {
    if (isFirstRef.current) {
      isFirstRef.current = false;
      return;
    }

    restoreSelection();
  }, [editorFontSize, restoreSelection]);
};

export const useSelectionTracking = (
  saveSelection: () => void,
  updateActiveFormats: () => void,
) => {
  useEffect(() => {
    const handleSelectionChange = () => {
      saveSelection();
      updateActiveFormats();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [saveSelection, updateActiveFormats]);
};
