import type { TextSpan } from "@/lib/types";
import {
  normalizeTextSpans,
  spansToPlainText,
  textStyleOfSpan,
} from "./spans";

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
