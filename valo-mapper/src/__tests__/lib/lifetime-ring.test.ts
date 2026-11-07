import { drawLifetimeRing } from "@/components/canvas-icons/lifetime-ring";

const buildContext = () => {
  const attrs: Record<string, string | number> = {};
  const strokes: { color: string; width: number; alpha: number }[] = [];
  const arcs: { start: number; end: number }[] = [];
  return {
    strokes,
    arcs,
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    arc: (_x: number, _y: number, _r: number, start: number, end: number) => {
      arcs.push({ start, end });
    },
    stroke: () => {
      strokes.push({
        color: String(attrs.strokeStyle),
        width: Number(attrs.lineWidth),
        alpha: Number(attrs.globalAlpha ?? 1),
      });
    },
    setAttr: (attr: string, value: string | number) => {
      attrs[attr] = value;
    },
  };
};

describe("drawLifetimeRing", () => {
  it("draws a darker outline behind the white spike ring", () => {
    const context = buildContext();

    drawLifetimeRing(context, {
      radius: 21,
      strokeWidth: 2.5,
      color: "#ffffff",
      outlineColor: "#000000",
      outlineWidth: 1.5,
      progress: 0.5,
    });

    const outline = context.strokes.filter(
      (stroke) => stroke.color === "#000000",
    );
    const ring = context.strokes.filter((stroke) => stroke.color === "#ffffff");
    expect(outline.length).toBeGreaterThan(0);
    expect(ring.length).toBeGreaterThan(0);
    expect(outline[0].width).toBe(5.5);
    expect(ring[0].width).toBe(2.5);
  });

  it("wipes clockwise from 12 o'clock", () => {
    const context = buildContext();

    drawLifetimeRing(context, {
      radius: 21,
      strokeWidth: 2,
      color: "#ffffff",
      progress: 0.5,
    });

    const first = context.arcs[0];
    const last = context.arcs[context.arcs.length - 1];
    // The first visible segment is just after 6 o'clock; the last ends at
    // 12 o'clock, so the top half was wiped clockwise from the start.
    expect(first.start).toBeGreaterThanOrEqual(Math.PI / 2);
    expect(first.start).toBeLessThan(Math.PI / 2 + (Math.PI * 2) / 180 * 2);
    expect(last.end).toBeGreaterThanOrEqual(Math.PI * 1.5);
  });

  it("draws nothing when the lifetime has elapsed", () => {
    const context = buildContext();

    drawLifetimeRing(context, {
      radius: 21,
      strokeWidth: 2,
      color: "#ffffff",
      progress: 1,
    });

    expect(context.strokes).toHaveLength(0);
  });
});
