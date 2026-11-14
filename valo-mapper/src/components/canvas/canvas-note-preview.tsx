"use client";

import {
  useCanvasEntities,
  useCanvasUi,
} from "@/contexts/canvas-context";
import { useHoveredElementId } from "@/contexts/hover-context";
import { useSettings } from "@/contexts/settings-context";
import { getNotePreviewAnchor } from "@/lib/canvas-note";
import { findCanvasItemInstanceById } from "@/lib/canvas-selection";
import {
  NOTE_PREVIEW_HIDE_DELAY_MS,
  NOTE_PREVIEW_MAX_LINES,
  NOTE_PREVIEW_MAX_WIDTH,
  VIRTUAL_WIDTH,
} from "@/lib/consts";
import { useCommitCount } from "@/lib/perf-beacon";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Label, Tag, Text } from "react-konva";

const FONT_SIZE = 20;
const LINE_HEIGHT = 1.35;
const PADDING = 10;
const POINTER_GAP = 16;
const EDGE_MARGIN = 24;
const APPROX_CHAR_WIDTH_RATIO = 0.56;
const FONT_FAMILY = "Arial";
const MIN_CARD_WIDTH = 100;

/** Measure with Konva so the card height matches the rendered text. */
const measureTextHeight = (
  note: string,
  width: number,
  fontSize: number,
  padding: number,
) => {
  const node = new Konva.Text({
    text: note,
    width,
    fontSize,
    fontFamily: FONT_FAMILY,
    lineHeight: LINE_HEIGHT,
    padding,
    wrap: "word",
  });
  const height = node.getHeight();
  node.destroy();
  return height;
};

const getPreviewLayout = (note: string) => {
  const fontSize = FONT_SIZE;
  const padding = PADDING;
  const approximateCharWidth = fontSize * APPROX_CHAR_WIDTH_RATIO;

  const lines = note.split("\n");
  const longestLine = lines.reduce(
    (longest, line) => Math.max(longest, line.length),
    0,
  );
  const contentWidth = Math.min(
    NOTE_PREVIEW_MAX_WIDTH,
    Math.max(MIN_CARD_WIDTH, longestLine * approximateCharWidth + padding * 2),
  );

  const fullHeight = measureTextHeight(
    note,
    contentWidth,
    fontSize,
    padding,
  );
  const maxContentHeight = fontSize * LINE_HEIGHT * NOTE_PREVIEW_MAX_LINES;
  const isTruncated = fullHeight - padding * 2 > maxContentHeight + 0.01;
  const cardHeight = isTruncated
    ? maxContentHeight + padding * 2
    : fullHeight;
  const textHeight = isTruncated ? cardHeight : undefined;

  return {
    fontSize,
    padding,
    contentWidth,
    textHeight,
    isTruncated,
    cardHeight,
  };
};

/** Hover note card; listening so it can itself be hovered and clicked. */
export const CanvasNotePreview = memo(function CanvasNotePreview() {
  useCommitCount("CanvasNotePreview");

  const hoveredElementId = useHoveredElementId();
  const {
    isDrawMode,
    isDraggingCanvasItem,
    editingTextId,
    editingNoteTarget,
    setEditingNoteTarget,
  } = useCanvasUi();
  const entities = useCanvasEntities();
  const { agentsSettings, abilitiesSettings } = useSettings();

  const [displayedId, setDisplayedId] = useState<string | null>(
    hoveredElementId,
  );
  const [isPreviewHovered, setIsPreviewHovered] = useState(false);

  const hoveredElementIdRef = useRef(hoveredElementId);
  const isPreviewHoveredRef = useRef(isPreviewHovered);
  const hideTimerRef = useRef<number | null>(null);
  hoveredElementIdRef.current = hoveredElementId;
  isPreviewHoveredRef.current = isPreviewHovered;

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      if (!hoveredElementIdRef.current && !isPreviewHoveredRef.current) {
        setDisplayedId(null);
      }
    }, NOTE_PREVIEW_HIDE_DELAY_MS);
  }, [cancelHide]);

  useEffect(() => {
    if (hoveredElementId) {
      cancelHide();
      setDisplayedId(hoveredElementId);
      return;
    }

    if (!isPreviewHoveredRef.current) {
      scheduleHide();
    }

    return cancelHide;
  }, [hoveredElementId, cancelHide, scheduleHide]);

  useEffect(() => () => cancelHide(), [cancelHide]);

  useEffect(() => {
    if (!editingNoteTarget) return;

    cancelHide();
    setIsPreviewHovered(false);
    setDisplayedId(null);
  }, [editingNoteTarget, cancelHide]);

  const entry = displayedId
    ? findCanvasItemInstanceById(entities, displayedId)
    : null;
  const note = entry?.item.note?.trim();

  const layout = useMemo(() => {
    if (!note) return null;
    return getPreviewLayout(note);
  }, [note]);

  const isVisible =
    !isDrawMode &&
    !isDraggingCanvasItem &&
    !editingTextId &&
    !editingNoteTarget &&
    Boolean(entry) &&
    Boolean(note) &&
    Boolean(layout);

  // Konva may not send mouseleave when the card disappears mid-hover.
  useEffect(() => {
    if (!isVisible) {
      setIsPreviewHovered(false);
    }
  }, [isVisible]);

  if (!isVisible || !entry || !note || !layout) {
    return null;
  }

  const anchor = getNotePreviewAnchor(entry, {
    agentsSettings,
    abilitiesSettings,
  });
  const gap = POINTER_GAP;
  const edgeMargin = EDGE_MARGIN;

  const cardWidth = layout.contentWidth;
  const cardHeight = layout.cardHeight;
  const maxX = Math.max(edgeMargin, VIRTUAL_WIDTH - cardWidth - edgeMargin);
  const x = Math.min(
    Math.max(edgeMargin, anchor.x - cardWidth / 2),
    maxX,
  );
  const y = Math.max(edgeMargin, anchor.y - gap - cardHeight);

  const setCursor = (
    event: KonvaEventObject<MouseEvent>,
    cursor: string,
  ) => {
    const stage = event.target.getStage();
    if (stage) {
      stage.container().style.cursor = cursor;
    }
  };

  const handlePreviewEnter = (event: KonvaEventObject<MouseEvent>) => {
    cancelHide();
    setIsPreviewHovered(true);
    setCursor(event, "pointer");
  };

  const handlePreviewLeave = (event: KonvaEventObject<MouseEvent>) => {
    setIsPreviewHovered(false);
    setCursor(event, "default");

    if (!hoveredElementIdRef.current) {
      scheduleHide();
    }
  };

  const stopCanvasInteraction = (
    event: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    event.cancelBubble = true;
  };

  const openNoteEditor = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    event.cancelBubble = true;
    cancelHide();
    setIsPreviewHovered(false);

    if (!entry) return;

    setDisplayedId(null);
    setEditingNoteTarget({ id: entry.item.id, type: entry.type });
  };

  return (
    <Label
      x={x}
      y={y}
      name="note-preview"
      onMouseEnter={handlePreviewEnter}
      onMouseLeave={handlePreviewLeave}
      onMouseDown={stopCanvasInteraction}
      onTouchStart={stopCanvasInteraction}
      onClick={openNoteEditor}
      onTap={openNoteEditor}
    >
      <Tag
        fill="#18181b"
        stroke="#3f3f46"
        strokeWidth={1}
        cornerRadius={10}
        shadowColor="#000000"
        shadowBlur={10}
        shadowOpacity={0.4}
        shadowOffsetY={2}
        opacity={0.97}
      />
      <Text
        text={note}
        width={layout.contentWidth}
        height={layout.textHeight}
        fontSize={layout.fontSize}
        fontFamily="Arial"
        lineHeight={LINE_HEIGHT}
        fill="#f4f4f5"
        padding={layout.padding}
        wrap="word"
        ellipsis={layout.isTruncated}
        perfectDrawEnabled={false}
      />
    </Label>
  );
});
