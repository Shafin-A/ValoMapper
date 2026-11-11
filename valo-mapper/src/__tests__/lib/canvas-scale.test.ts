import { getCanvasFitScale } from "@/lib/canvas-scale";

describe("getCanvasFitScale", () => {
  it("fits the whole virtual stage on desktop", () => {
    expect(getCanvasFitScale(1280, 720)).toBe(0.5);
    expect(getCanvasFitScale(1024, 768)).toBeCloseTo(0.4, 5);
  });

  it("fits the rendered map itself on mobile with a margin", () => {
    expect(getCanvasFitScale(390, 700, true)).toBeCloseTo(
      (390 - 48) / (1000 * 1.25),
      5,
    );
  });

  it("uses the limiting dimension for mobile landscape", () => {
    expect(getCanvasFitScale(800, 360, true)).toBeCloseTo(
      (360 - 48) / (1000 * 1.25),
      5,
    );
  });
});
