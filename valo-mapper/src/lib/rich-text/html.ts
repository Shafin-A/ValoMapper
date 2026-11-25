import type { TextSpan } from "@/lib/types";
import { normalizeTextColor } from "./colors";
import { normalizeTextSpans } from "./spans";

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
