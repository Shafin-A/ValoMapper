import type { TextStyle } from "@/lib/types";
import { TEXT_FONT_SIZE } from "./constants";

export type RichTextMeasure = (
  text: string,
  style: TextStyle,
  fontSize: number,
  fontFamily: string,
) => number;

export const resolveTextFontSize = (fontSize?: number): number => {
  if (!fontSize || !Number.isFinite(fontSize)) return TEXT_FONT_SIZE;
  return Math.min(72, Math.max(10, Math.round(fontSize)));
};

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
