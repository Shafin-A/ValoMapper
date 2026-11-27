import type { TextSpan } from "@/lib/types";
import { TEXT_FONT_FAMILY } from "./constants";
import { spansToHtml } from "./html";
import {
  parseListMarker,
  splitSpansAt,
  splitSpansIntoLines,
} from "./lists";
import { defaultMeasureText, resolveTextFontSize } from "./measure";
import { normalizeTextSpans, spansToPlainText } from "./spans";

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
          `<span data-text-marker-line="${index}" style="display:inline-block;width:${markerWidthEm}em;vertical-align:top;white-space:pre;">${markerHtml}</span>` +
          `<span data-text-content-line="${index}" style="display:inline-block;width:calc(100% - ${markerWidthEm}em);vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;">${contentHtml}</span>`;
      } else {
        html = spansToHtml(lineSpans);
      }

      return index < lines.length - 1 ? `${html}<br>` : html;
    })
    .join("");
};
