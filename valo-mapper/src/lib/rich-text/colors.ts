import { DEFAULT_TEXT_COLOR } from "./constants";

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
