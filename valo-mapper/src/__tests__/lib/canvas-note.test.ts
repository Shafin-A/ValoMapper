import {
  getCanvasItemNoteLabel,
  getNotePreviewAnchor,
  normalizeNote,
} from "@/lib/canvas-note";
import { NOTE_MAX_LENGTH } from "@/lib/consts";
import type {
  AbilityCanvas,
  AgentCanvas,
  CanvasItemInstance,
  IconSettings,
  ImageCanvas,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";

const iconSettings = (scale: number): IconSettings => ({
  scale,
  borderOpacity: 1,
  borderWidth: 1,
  radius: 4,
  allyColor: "#00ff00",
  enemyColor: "#ff0000",
});

const settings = {
  agentsSettings: iconSettings(40),
  abilitiesSettings: iconSettings(60),
};

const agent: AgentCanvas = {
  id: "agent-1",
  name: "Jett",
  role: "Duelist",
  isAlly: true,
  x: 10,
  y: 20,
};

const ability: AbilityCanvas = {
  id: "ability-1",
  name: "Brimstone Smoke",
  action: "brim_smoke",
  isAlly: true,
  x: 30,
  y: 40,
};

const text: TextCanvas = {
  id: "text-1",
  text: "Hello",
  width: 100,
  height: 50,
  x: 5,
  y: 6,
};

const image: ImageCanvas = {
  id: "image-1",
  src: "image.png",
  width: 200,
  height: 120,
  x: 7,
  y: 8,
};

const toolIcon: ToolIconCanvas = {
  id: "tool-1",
  name: "spike",
  width: 32,
  height: 32,
  x: 9,
  y: 10,
};

describe("canvas note helpers", () => {
  it("trims notes and treats whitespace as absent", () => {
    expect(normalizeNote("  flank mid  ")).toBe("flank mid");
    expect(normalizeNote("first line\nsecond line")).toBe(
      "first line\nsecond line",
    );
    expect(normalizeNote("   ")).toBeUndefined();
    expect(normalizeNote("")).toBeUndefined();
  });

  it("caps notes at the maximum length", () => {
    const longNote = "a".repeat(NOTE_MAX_LENGTH + 25);
    expect(normalizeNote(longNote)).toHaveLength(NOTE_MAX_LENGTH);
  });

  it("anchors the preview above the top-centre of each item type", () => {
    expect(
      getNotePreviewAnchor({ type: "agent", item: agent }, settings),
    ).toEqual({ x: 10, y: 0 });
    expect(
      getNotePreviewAnchor({ type: "ability", item: ability }, settings),
    ).toEqual({ x: 30, y: 10 });
    expect(
      getNotePreviewAnchor({ type: "text", item: text }, settings),
    ).toEqual({ x: 55, y: 6 });
    expect(
      getNotePreviewAnchor({ type: "image", item: image }, settings),
    ).toEqual({ x: 107, y: 8 });
    expect(
      getNotePreviewAnchor({ type: "tool", item: toolIcon }, settings),
    ).toEqual({ x: 9, y: -6 });
  });

  it("labels targets for the editor description", () => {
    const instances: Array<[CanvasItemInstance, string]> = [
      [{ type: "agent", item: agent }, "Jett (agent)"],
      [{ type: "ability", item: ability }, "Brimstone Smoke (ability)"],
      [{ type: "text", item: text }, "Text"],
      [{ type: "image", item: image }, "Image"],
      [{ type: "tool", item: toolIcon }, "spike (icon)"],
    ];

    instances.forEach(([entry, label]) => {
      expect(getCanvasItemNoteLabel(entry)).toBe(label);
    });
  });
});
