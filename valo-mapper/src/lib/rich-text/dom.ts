import type { TextSpan, TextStyle } from "@/lib/types";
import { DEFAULT_TEXT_COLOR } from "./constants";
import { normalizeTextColor } from "./colors";
import { cleanStyle, styleKey } from "./spans";

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
