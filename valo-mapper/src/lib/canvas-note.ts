import { NOTE_MAX_LENGTH } from "@/lib/consts";
import type { CanvasItemInstance, IconSettings } from "@/lib/types";
import type { Vector2d } from "konva/lib/types";

type NoteAnchorSettings = {
  agentsSettings: IconSettings;
  abilitiesSettings: IconSettings;
};

// An empty or whitespace-only note is treated as no note at all.
export const normalizeNote = (value: string): string | undefined => {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.slice(0, NOTE_MAX_LENGTH);
};

/** Top-centre of an item, used to place the hover note card above it. */
export const getNotePreviewAnchor = (
  entry: CanvasItemInstance,
  settings: NoteAnchorSettings,
): Vector2d => {
  switch (entry.type) {
    case "agent": {
      const half = settings.agentsSettings.scale / 2;
      return { x: entry.item.x, y: entry.item.y - half };
    }
    case "ability": {
      const half = settings.abilitiesSettings.scale / 2;
      return { x: entry.item.x, y: entry.item.y - half };
    }
    case "tool":
      return {
        x: entry.item.x,
        y: entry.item.y - entry.item.height / 2,
      };
    case "image":
    case "text":
      return { x: entry.item.x + entry.item.width / 2, y: entry.item.y };
  }
};

export const getCanvasItemNoteLabel = (entry: CanvasItemInstance): string => {
  switch (entry.type) {
    case "agent":
      return `${entry.item.name} (agent)`;
    case "ability":
      return `${entry.item.name} (ability)`;
    case "tool":
      return `${entry.item.name} (icon)`;
    case "text":
      return "Text";
    case "image":
      return "Image";
  }
};
