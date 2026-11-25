import type { TextSpan, TextStyle } from "@/lib/types";
import {
  TEXT_FONT_FAMILY,
  TEXT_LINE_HEIGHT,
  TEXT_PADDING,
} from "./constants";
import {
  parseListMarker,
  splitSpansAt,
  splitSpansIntoLines,
} from "./lists";
import {
  type RichTextMeasure,
  defaultMeasureText,
  resolveTextFontSize,
} from "./measure";
import {
  cleanStyle,
  normalizeTextSpans,
  spansToPlainText,
  styleFromText,
  styleKey,
} from "./spans";

export type RichTextLayoutOptions = {
  width: number;
  fontSize?: number;
  fontFamily?: string;
  lineHeight?: number;
  padding?: number;
};

export type RichTextSegment = {
  text: string;
  x: number;
  width: number;
  style: TextStyle;
};

export type RichTextLine = {
  y: number;
  segments: RichTextSegment[];
};

export type RichTextLayout = {
  lines: RichTextLine[];
  height: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  padding: number;
};

type Piece = { text: string; style: TextStyle };
type WordToken = { type: "word"; pieces: Piece[] };
type SpaceToken = { type: "space"; text: string; style: TextStyle };
type NewlineToken = { type: "newline" };
type RichToken = WordToken | SpaceToken | NewlineToken;

const tokenize = (spans: TextSpan[]): RichToken[] => {
  const tokens: RichToken[] = [];

  const appendWordPiece = (text: string, style: TextStyle) => {
    const last = tokens[tokens.length - 1];
    if (last && last.type === "word") {
      last.pieces.push({ text, style });
    } else {
      tokens.push({ type: "word", pieces: [{ text, style }] });
    }
  };

  for (const span of spans) {
    const style = cleanStyle(styleFromText(span));
    const matches = span.text.match(/\n|[^\S\n]+|\S+/g);
    if (!matches) continue;

    for (const match of matches) {
      if (match === "\n") {
        tokens.push({ type: "newline" });
      } else if (/^\s+$/.test(match)) {
        tokens.push({ type: "space", text: match, style });
      } else {
        appendWordPiece(match, style);
      }
    }
  }

  return tokens;
};

type MeasuredSegment = { text: string; style: TextStyle; width: number };

const spansToMeasuredSegments = (
  spans: TextSpan[],
  measurePiece: (text: string, style: TextStyle) => number,
): MeasuredSegment[] => {
  const segments: MeasuredSegment[] = [];

  for (const span of spans) {
    if (!span.text) continue;

    const style = cleanStyle(styleFromText(span));
    const width = measurePiece(span.text, style);
    const last = segments[segments.length - 1];

    if (last && styleKey(last.style) === styleKey(style)) {
      last.text += span.text;
      last.width += width;
    } else {
      segments.push({ text: span.text, style, width });
    }
  }

  return segments;
};

const wrapInlineSpans = (
  spans: TextSpan[],
  availableWidth: number,
  measurePiece: (text: string, style: TextStyle) => number,
): MeasuredSegment[][] => {
  const tokens = tokenize(spans);
  const lineSegments: MeasuredSegment[][] = [];
  let current: MeasuredSegment[] = [];
  let currentWidth = 0;

  const appendSegment = (
    text: string,
    style: TextStyle,
    textWidth: number,
  ) => {
    if (!text) return;

    const last = current[current.length - 1];
    if (last && styleKey(last.style) === styleKey(style)) {
      last.text += text;
      last.width += textWidth;
    } else {
      current.push({ text, style: cleanStyle(style), width: textWidth });
    }

    currentWidth += textWidth;
  };

  const flushLine = () => {
    lineSegments.push(current);
    current = [];
    currentWidth = 0;
  };

  for (const token of tokens) {
    if (token.type === "newline") {
      flushLine();
      continue;
    }

    if (token.type === "space") {
      if (current.length === 0) continue;

      const spaceWidth = measurePiece(token.text, token.style);
      appendSegment(token.text, token.style, spaceWidth);
      continue;
    }

    const wordWidth = token.pieces.reduce(
      (total, piece) => total + measurePiece(piece.text, piece.style),
      0,
    );

    if (current.length > 0 && currentWidth + wordWidth > availableWidth) {
      flushLine();
    }

    if (wordWidth <= availableWidth) {
      for (const piece of token.pieces) {
        appendSegment(
          piece.text,
          piece.style,
          measurePiece(piece.text, piece.style),
        );
      }
      continue;
    }

    for (const piece of token.pieces) {
      for (const character of Array.from(piece.text)) {
        const characterWidth = measurePiece(character, piece.style);

        if (
          current.length > 0 &&
          currentWidth + characterWidth > availableWidth
        ) {
          flushLine();
        }

        appendSegment(character, piece.style, characterWidth);
      }
    }
  }

  flushLine();
  return lineSegments;
};

export const layoutRichText = (
  spans: TextSpan[] | undefined,
  options: RichTextLayoutOptions,
  measure: RichTextMeasure = defaultMeasureText,
): RichTextLayout => {
  const fontSize = resolveTextFontSize(options.fontSize);
  const fontFamily = options.fontFamily ?? TEXT_FONT_FAMILY;
  const lineHeight = options.lineHeight ?? TEXT_LINE_HEIGHT;
  const padding = options.padding ?? TEXT_PADDING;
  const width = Math.max(1, options.width);
  const availableWidth = Math.max(1, width - padding * 2);
  const lineHeightPx = fontSize * lineHeight;

  const measurePiece = (text: string, style: TextStyle) =>
    measure(text, style, fontSize, fontFamily);

  const visualLines: { segments: MeasuredSegment[]; startX: number }[] = [];
  const logicalLines = splitSpansIntoLines(normalizeTextSpans(spans));

  for (const lineSpans of logicalLines) {
    const marker = parseListMarker(spansToPlainText(lineSpans));

    if (marker) {
      const [markerSpans, contentSpans] = splitSpansAt(
        lineSpans,
        marker.contentStart,
      );
      const markerSegments = spansToMeasuredSegments(markerSpans, measurePiece);
      const markerWidth = markerSegments.reduce(
        (total, segment) => total + segment.width,
        0,
      );
      const contentLines = wrapInlineSpans(
        contentSpans,
        Math.max(1, availableWidth - markerWidth),
        measurePiece,
      );

      contentLines.forEach((segments, index) => {
        visualLines.push({
          segments: index === 0 ? [...markerSegments, ...segments] : segments,
          startX: index === 0 ? padding : padding + markerWidth,
        });
      });

      continue;
    }

    const wrapped = wrapInlineSpans(lineSpans, availableWidth, measurePiece);
    wrapped.forEach((segments) => {
      visualLines.push({ segments, startX: padding });
    });
  }

  const lines: RichTextLine[] = visualLines.map((line, lineIndex) => {
    let x = line.startX;

    const positioned = line.segments.map((segment) => {
      const positionedSegment: RichTextSegment = {
        text: segment.text,
        style: segment.style,
        x,
        width: segment.width,
      };
      x += segment.width;
      return positionedSegment;
    });

    return {
      y: padding + lineIndex * lineHeightPx,
      segments: positioned,
    };
  });

  return {
    lines,
    height: padding * 2 + lines.length * lineHeightPx,
    width,
    fontSize,
    fontFamily,
    lineHeight,
    padding,
  };
};
