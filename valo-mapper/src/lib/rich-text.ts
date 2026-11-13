import type { TextCanvas, TextSpan, TextStyle } from "@/lib/types";

export const DEFAULT_TEXT_COLOR = "#ffffff";
export const TEXT_PLACEHOLDER_COLOR = "#52525b";
export const TEXT_FONT_SIZE = 18;
export const TEXT_FONT_FAMILY = "Arial";
export const TEXT_LINE_HEIGHT = 1;
export const TEXT_PADDING = 10;
export const TEXT_MIN_HEIGHT = 60;
export const TEXT_MIN_WIDTH = 100;
export const TEXT_FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32, 40];

const HEX_COLOR_PATTERN = /^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/;
const RGB_COLOR_PATTERN = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/;

const toHexPart = (value: number): string =>
  Math.min(255, Math.max(0, value)).toString(16).padStart(2, "0");

export const normalizeTextColor = (
  color?: string | null,
): string | undefined => {
  if (!color) return undefined;

  const value = color.trim().toLowerCase();
  if (!value) return undefined;

  let hex: string | undefined;

  const rgb = value.match(RGB_COLOR_PATTERN);
  if (rgb) {
    hex = `#${toHexPart(Number(rgb[1]))}${toHexPart(Number(rgb[2]))}${toHexPart(Number(rgb[3]))}`;
  } else if (HEX_COLOR_PATTERN.test(value)) {
    if (value.length === 4) {
      hex = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
    } else {
      hex = value;
    }
  } else {
    return undefined;
  }

  return hex === DEFAULT_TEXT_COLOR ? undefined : hex;
};

export const resolveTextFontSize = (fontSize?: number): number => {
  if (!fontSize || !Number.isFinite(fontSize)) return TEXT_FONT_SIZE;
  return Math.min(72, Math.max(10, Math.round(fontSize)));
};

const cleanStyle = (style: TextStyle): TextStyle => {
  const cleaned: TextStyle = {};

  if (style.bold) cleaned.bold = true;
  if (style.italic) cleaned.italic = true;
  if (style.underline) cleaned.underline = true;

  const color = normalizeTextColor(style.color);
  if (color) cleaned.color = color;

  return cleaned;
};

const styleKey = (style: TextStyle): string =>
  `${style.bold ? 1 : 0}${style.italic ? 1 : 0}${
    style.underline ? 1 : 0
  }${normalizeTextColor(style.color) ?? ""}`;

const styleFromText = (span: TextSpan): TextStyle => ({
  bold: span.bold,
  italic: span.italic,
  underline: span.underline,
  color: span.color,
});

export const normalizeTextSpans = (
  spans?: TextSpan[] | null,
  fallbackText = "",
): TextSpan[] => {
  const source: TextSpan[] =
    spans && spans.length > 0
      ? spans
      : fallbackText
        ? [{ text: fallbackText }]
        : [];

  const result: TextSpan[] = [];

  for (const span of source) {
    if (!span || typeof span.text !== "string" || span.text.length === 0) {
      continue;
    }

    const style = cleanStyle(styleFromText(span));
    const last = result[result.length - 1];

    if (last && styleKey(last) === styleKey(style)) {
      last.text += span.text;
    } else {
      result.push({ text: span.text, ...style });
    }
  }

  return result;
};

export const textSpansForItem = (
  item: Pick<TextCanvas, "text" | "spans">,
): TextSpan[] => normalizeTextSpans(item.spans, item.text);

export const spansToPlainText = (spans?: TextSpan[] | null): string =>
  (spans ?? []).map((span) => span.text).join("");

export const spansHaveFormatting = (spans: TextSpan[]): boolean =>
  spans.some((span) =>
    Boolean(
      span.bold ||
        span.italic ||
        span.underline ||
        normalizeTextColor(span.color),
    ),
  );

export type ListMarkerInfo = {
  type: "bullet" | "number";
  leading: string;
  token: string;
  number?: number;
  marker: string;
  contentStart: number;
};

const LIST_MARKER_PATTERN = /^(\s*)((?:[•\-*])|(?:\d{1,9}[.)]))(\s+)/;

export const parseListMarker = (lineText: string): ListMarkerInfo | null => {
  const match = lineText.match(LIST_MARKER_PATTERN);
  if (!match) return null;

  const marker = match[0];
  const leading = match[1];
  const token = match[2];
  const isNumber = /^\d/.test(token);

  return {
    type: isNumber ? "number" : "bullet",
    leading,
    token,
    number: isNumber ? Number.parseInt(token, 10) : undefined,
    marker,
    contentStart: marker.length,
  };
};

export const splitSpansIntoLines = (spans: TextSpan[]): TextSpan[][] => {
  const lines: TextSpan[][] = [[]];

  for (const span of spans) {
    const text = span.text;
    let start = 0;

    for (let index = 0; index < text.length; index += 1) {
      if (text[index] !== "\n") continue;

      if (index > start) {
        lines[lines.length - 1].push({
          ...span,
          text: text.slice(start, index),
        });
      }

      lines.push([]);
      start = index + 1;
    }

    if (start < text.length) {
      lines[lines.length - 1].push({ ...span, text: text.slice(start) });
    }
  }

  return lines;
};

export const splitSpansAt = (
  spans: TextSpan[],
  offset: number,
): [TextSpan[], TextSpan[]] => {
  const before: TextSpan[] = [];
  const after: TextSpan[] = [];
  let remaining = Math.max(0, offset);
  let split = false;

  for (const span of spans) {
    if (split) {
      after.push({ ...span });
      continue;
    }

    if (remaining >= span.text.length) {
      before.push({ ...span });
      remaining -= span.text.length;
      continue;
    }

    if (remaining > 0) {
      before.push({ ...span, text: span.text.slice(0, remaining) });
      after.push({ ...span, text: span.text.slice(remaining) });
    } else {
      after.push({ ...span });
    }

    split = true;
  }

  return [normalizeTextSpans(before), normalizeTextSpans(after)];
};

export const joinSpansLines = (lines: TextSpan[][]): TextSpan[] => {
  const result: TextSpan[] = [];

  lines.forEach((line, index) => {
    result.push(...line);
    if (index < lines.length - 1) {
      result.push({ text: "\n" });
    }
  });

  return normalizeTextSpans(result);
};

export const textStyleOfSpan = (span?: TextSpan): TextStyle =>
  span
    ? {
        bold: span.bold,
        italic: span.italic,
        underline: span.underline,
        color: span.color,
      }
    : {};

export const applyListMarker = (
  lineSpans: TextSpan[],
  type: "bullet" | "number",
  number = 1,
): TextSpan[] => {
  const text = spansToPlainText(lineSpans);
  const leading = text.match(/^\s*/)?.[0] ?? "";
  const existing = parseListMarker(text);

  const leadingSpans = splitSpansAt(lineSpans, leading.length)[0];
  const contentSpans = existing
    ? splitSpansAt(lineSpans, existing.contentStart)[1]
    : splitSpansAt(lineSpans, leading.length)[1];

  const markerText = type === "bullet" ? "• " : `${number}. `;
  const markerStyle = textStyleOfSpan(contentSpans[0] ?? lineSpans[0]);

  return normalizeTextSpans([
    ...leadingSpans,
    { text: markerText, ...markerStyle },
    ...contentSpans,
  ]);
};

export const removeListMarker = (lineSpans: TextSpan[]): TextSpan[] => {
  const text = spansToPlainText(lineSpans);
  const marker = parseListMarker(text);
  if (!marker) return lineSpans;

  const leadingSpans = splitSpansAt(lineSpans, marker.leading.length)[0];
  const contentSpans = splitSpansAt(lineSpans, marker.contentStart)[1];

  return normalizeTextSpans([...leadingSpans, ...contentSpans]);
};

export const renumberListLines = (spans: TextSpan[]): TextSpan[] => {
  const lines = splitSpansIntoLines(spans);
  let counter = 0;

  const updated = lines.map((line) => {
    const text = spansToPlainText(line);
    const marker = parseListMarker(text);

    if (!marker) {
      counter = 0;
      return line;
    }

    if (marker.type === "bullet") {
      counter = 0;
      return line;
    }

    counter += 1;
    const punctuation = marker.token.endsWith(")") ? ")" : ".";
    const nextToken = `${counter}${punctuation}`;

    if (marker.token === nextToken) return line;

    const leadingSpans = splitSpansAt(line, marker.leading.length)[0];
    const contentSpans = splitSpansAt(line, marker.contentStart)[1];
    const markerStyle = textStyleOfSpan(contentSpans[0] ?? line[0]);

    return normalizeTextSpans([
      ...leadingSpans,
      { text: `${nextToken} `, ...markerStyle },
      ...contentSpans,
    ]);
  });

  return joinSpansLines(updated);
};

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);

export const spansToHtml = (spans?: TextSpan[] | null): string =>
  normalizeTextSpans(spans)
    .map((span) => {
      const styles: string[] = [];

      if (span.bold) styles.push("font-weight:700");
      if (span.italic) styles.push("font-style:italic");
      if (span.underline) styles.push("text-decoration:underline");

      const color = normalizeTextColor(span.color);
      if (color) styles.push(`color:${color}`);

      const text = escapeHtml(span.text).replace(/\n/g, "<br>");

      return styles.length > 0
        ? `<span style="${styles.join(";")}">${text}</span>`
        : text;
    })
    .join("");

const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DD",
  "DIV",
  "DL",
  "DT",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TBODY",
  "TD",
  "TFOOT",
  "TH",
  "THEAD",
  "TR",
  "UL",
]);

const mergeStyles = (base: TextStyle, own: TextStyle): TextStyle => ({
  bold: own.bold ?? base.bold,
  italic: own.italic ?? base.italic,
  underline: own.underline ?? base.underline,
  color: own.color ?? base.color,
});

const getElementStyle = (element: HTMLElement): TextStyle => {
  const style: TextStyle = {};
  const tag = element.tagName;

  if (tag === "B" || tag === "STRONG") style.bold = true;
  if (tag === "I" || tag === "EM") style.italic = true;
  if (tag === "U") style.underline = true;

  const inline = element.style;

  const fontWeight = inline.fontWeight;
  if (fontWeight) {
    const numeric = Number.parseInt(fontWeight, 10);
    style.bold =
      fontWeight === "bold" ||
      fontWeight === "bolder" ||
      (Number.isFinite(numeric) && numeric >= 600);
  }

  const fontStyle = inline.fontStyle;
  if (fontStyle) {
    style.italic = fontStyle === "italic" || fontStyle === "oblique";
  }

  const decoration = inline.textDecorationLine || inline.textDecoration;
  if (decoration) {
    style.underline = decoration.includes("underline");
  }

  const color =
    inline.color || (tag === "FONT" ? element.getAttribute("color") : null);
  if (color) {
    style.color = normalizeTextColor(color) ?? DEFAULT_TEXT_COLOR;
  }

  return style;
};

export type ReadSpansOptions = {
  trimTrailingNewlines?: boolean;
};

export const readSpansFromDom = (
  root: HTMLElement,
  options: ReadSpansOptions = {},
): TextSpan[] => {
  const { trimTrailingNewlines = true } = options;
  const result: TextSpan[] = [];

  const appendText = (text: string, style: TextStyle) => {
    if (!text) return;

    const cleaned = cleanStyle(style);
    const last = result[result.length - 1];

    if (last && styleKey(last) === styleKey(cleaned)) {
      last.text += text;
    } else {
      result.push({ text, ...cleaned });
    }
  };

  const appendNewline = (style: TextStyle, explicit = false) => {
    if (result.length === 0) return;

    const last = result[result.length - 1];
    if (!explicit && last.text.endsWith("\n")) return;

    appendText("\n", style);
  };

  const walk = (node: Node, inherited: TextStyle, isRoot: boolean) => {
    if (node.nodeType === 3) {
      const value = (node.nodeValue ?? "")
        .replace(/\u00a0/g, " ")
        .replace(/\u200b/g, "");
      appendText(value, inherited);
      return;
    }

    if (node.nodeType !== 1) return;

    const element = node as HTMLElement;

    if (element.tagName === "BR") {
      appendNewline(inherited, true);
      return;
    }

    const style = mergeStyles(inherited, getElementStyle(element));
    const isBlock = !isRoot && BLOCK_TAGS.has(element.tagName);

    if (isBlock) appendNewline(style);

    element.childNodes.forEach((child) => walk(child, style, false));

    if (isBlock) appendNewline(style);
  };

  root.childNodes.forEach((child) => walk(child, {}, false));

  if (trimTrailingNewlines) {
    while (result.length > 0) {
      const last = result[result.length - 1];
      last.text = last.text.replace(/\n+$/, "");
      if (last.text.length > 0) break;
      result.pop();
    }
  }

  return result;
};

export type RichTextMeasure = (
  text: string,
  style: TextStyle,
  fontSize: number,
  fontFamily: string,
) => number;

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

const buildFont = (
  style: TextStyle,
  fontSize: number,
  fontFamily: string,
): string => {
  const parts: string[] = [];
  if (style.italic) parts.push("italic");
  if (style.bold) parts.push("700");
  parts.push(`${fontSize}px`);
  parts.push(fontFamily);
  return parts.join(" ");
};

let measureContext: CanvasRenderingContext2D | null | undefined;

const getMeasureContext = (): CanvasRenderingContext2D | null => {
  if (measureContext !== undefined) return measureContext;
  if (typeof document === "undefined") {
    measureContext = null;
    return null;
  }

  measureContext = document.createElement("canvas").getContext("2d");
  return measureContext;
};

export const defaultMeasureText: RichTextMeasure = (
  text,
  style,
  fontSize,
  fontFamily,
) => {
  if (!text) return 0;

  const context = getMeasureContext();
  if (!context) {
    return text.length * fontSize * (style.bold ? 0.6 : 0.55);
  }

  context.font = buildFont(style, fontSize, fontFamily);
  return context.measureText(text).width;
};

export type EditorHtmlOptions = {
  fontSize?: number;
  fontFamily?: string;
};

export const spansToEditorHtml = (
  spans: TextSpan[] | null | undefined,
  options: EditorHtmlOptions = {},
): string => {
  const fontSize = resolveTextFontSize(options.fontSize);
  const fontFamily = options.fontFamily ?? TEXT_FONT_FAMILY;
  const lines = splitSpansIntoLines(normalizeTextSpans(spans));

  return lines
    .map((lineSpans, index) => {
      const lineText = spansToPlainText(lineSpans);
      const marker = parseListMarker(lineText);
      let html: string;

      if (marker) {
        const [markerSpans, contentSpans] = splitSpansAt(
          lineSpans,
          marker.contentStart,
        );
        const markerWidth = markerSpans.reduce(
          (total, span) =>
            total + defaultMeasureText(span.text, span, fontSize, fontFamily),
          0,
        );
        const markerHtml = spansToHtml(markerSpans);
        const contentHtml = spansToHtml(contentSpans) || "\u200b";
        const markerWidthEm =
          fontSize > 0 ? markerWidth / fontSize : markerWidth;

        html =
          `<span style="display:inline-block;width:${markerWidthEm}em;vertical-align:top;white-space:pre;">${markerHtml}</span>` +
          `<span data-text-content-line="${index}" style="display:inline-block;width:calc(100% - ${markerWidthEm}em);vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;">${contentHtml}</span>`;
      } else {
        html = spansToHtml(lineSpans);
      }

      return index < lines.length - 1 ? `${html}<br>` : html;
    })
    .join("");
};

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

