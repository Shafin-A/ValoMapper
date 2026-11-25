import type { TextCanvas, TextSpan, TextStyle } from "@/lib/types";
import { normalizeTextColor } from "./colors";

export const cleanStyle = (style: TextStyle): TextStyle => {
  const cleaned: TextStyle = {};

  if (style.bold) cleaned.bold = true;
  if (style.italic) cleaned.italic = true;
  if (style.underline) cleaned.underline = true;

  const color = normalizeTextColor(style.color);
  if (color) cleaned.color = color;

  return cleaned;
};

export const styleKey = (style: TextStyle): string =>
  `${style.bold ? 1 : 0}${style.italic ? 1 : 0}${
    style.underline ? 1 : 0
  }${normalizeTextColor(style.color) ?? ""}`;

export const styleFromText = (span: TextSpan): TextStyle => ({
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

export const textStyleOfSpan = (span?: TextSpan): TextStyle =>
  span
    ? {
        bold: span.bold,
        italic: span.italic,
        underline: span.underline,
        color: span.color,
      }
    : {};
