import { traceVisionCone, VisionMask } from "@/lib/vision-cone-visibility";

const createMask = (width: number, height: number): VisionMask => ({
  width,
  height,
  pixels: new Uint8Array(width * height).fill(2),
});

const defaultFrame = {
  centerX: 50,
  centerY: 50,
  renderScale: 1,
};

describe("traceVisionCone", () => {
  it("keeps rays inside the playable map area", () => {
    const points = traceVisionCone({
      mask: createMask(100, 100),
      frame: defaultFrame,
      origin: { x: 80, y: 50 },
      directionDegrees: 0,
      apertureDegrees: 0,
      radius: 30,
    });

    expect(points[1].x).toBeCloseTo(20, 2);
    expect(points[1].y).toBeCloseTo(0);
  });

  it("stops each ray at the first wall pixel", () => {
    const mask = createMask(100, 100);
    for (let y = 0; y < mask.height; y++) {
      mask.pixels[y * mask.width + 60] = 3;
    }

    const points = traceVisionCone({
      mask,
      frame: defaultFrame,
      origin: { x: 50, y: 50 },
      directionDegrees: 0,
      apertureDegrees: 20,
      radius: 25,
    });

    expect(points[11].x).toBeCloseTo(10, 2);
    expect(points[11].y).toBeCloseTo(0);
    expect(
      points.slice(1).every((point) => Math.abs(point.x - 10) < 0.01),
    ).toBe(true);
  });

  it("lets a cone originating inside a closed outline see through its perimeter", () => {
    const mask = createMask(20, 20);
    const enclosedRegionTags = new Int32Array(20 * 20);
    for (let x = 5; x <= 14; x++) {
      mask.pixels[5 * 20 + x] = 3;
      mask.pixels[14 * 20 + x] = 3;
      enclosedRegionTags[5 * 20 + x] = -1;
      enclosedRegionTags[14 * 20 + x] = -1;
    }
    for (let y = 5; y <= 14; y++) {
      mask.pixels[y * 20 + 5] = 3;
      mask.pixels[y * 20 + 14] = 3;
    }
    for (let y = 6; y <= 13; y++) {
      for (let x = 6; x <= 13; x++) {
        enclosedRegionTags[y * 20 + x] = 1;
      }
    }
    mask.enclosedRegionTags = enclosedRegionTags;

    const points = traceVisionCone({
      mask,
      frame: { centerX: 10, centerY: 10, renderScale: 1 },
      origin: { x: 10, y: 10 },
      directionDegrees: 0,
      apertureDegrees: 0,
      radius: 12,
    });

    expect(points[1].x).toBeCloseTo(10, 2);
  });

  it("can exit into a different tagged region", () => {
    const mask = createMask(20, 20);
    const enclosedRegionTags = new Int32Array(20 * 20);
    for (let x = 5; x <= 14; x++) {
      mask.pixels[5 * 20 + x] = 3;
      mask.pixels[14 * 20 + x] = 3;
    }
    for (let y = 5; y <= 14; y++) {
      mask.pixels[y * 20 + 5] = 3;
      mask.pixels[y * 20 + 14] = 3;
    }
    for (let y = 6; y <= 13; y++) {
      for (let x = 6; x <= 13; x++) {
        enclosedRegionTags[y * 20 + x] = 1;
      }
    }
    for (let y = 6; y <= 13; y++) {
      for (let x = 15; x < 20; x++) {
        enclosedRegionTags[y * 20 + x] = 2;
      }
    }
    mask.enclosedRegionTags = enclosedRegionTags;

    const points = traceVisionCone({
      mask,
      frame: { centerX: 10, centerY: 10, renderScale: 1 },
      origin: { x: 10, y: 10 },
      directionDegrees: 0,
      apertureDegrees: 0,
      radius: 8,
    });

    expect(points[1].x).toBeCloseTo(8);
  });

  it("still blocks outside cones and outlines with a doorway", () => {
    const mask = createMask(20, 20);
    const enclosedRegionTags = new Int32Array(20 * 20);
    for (let x = 5; x <= 14; x++) {
      mask.pixels[5 * 20 + x] = 3;
      mask.pixels[14 * 20 + x] = 3;
      enclosedRegionTags[5 * 20 + x] = -1;
      enclosedRegionTags[14 * 20 + x] = -1;
    }
    for (let y = 5; y <= 14; y++) {
      mask.pixels[y * 20 + 5] = 3;
      mask.pixels[y * 20 + 14] = 3;
    }
    for (let y = 6; y <= 13; y++) {
      for (let x = 6; x <= 13; x++) {
        enclosedRegionTags[y * 20 + x] = 1;
      }
    }
    mask.enclosedRegionTags = enclosedRegionTags;

    const outsidePoints = traceVisionCone({
      mask,
      frame: { centerX: 10, centerY: 10, renderScale: 1 },
      origin: { x: 2, y: 10 },
      directionDegrees: 0,
      apertureDegrees: 0,
      radius: 12,
    });
    expect(outsidePoints[1].x).toBeCloseTo(3, 2);

    mask.enclosedRegionTags.fill(0);
    const doorwayPoints = traceVisionCone({
      mask,
      frame: { centerX: 10, centerY: 10, renderScale: 1 },
      origin: { x: 10, y: 10 },
      directionDegrees: 0,
      apertureDegrees: 0,
      radius: 12,
    });
    expect(doorwayPoints[1].x).toBeCloseTo(4, 2);
  });

  it("keeps internal walls inside an enclosed region opaque", () => {
    const mask = createMask(20, 20);
    const enclosedRegionTags = new Int32Array(20 * 20);
    for (let x = 5; x <= 14; x++) {
      mask.pixels[5 * 20 + x] = 3;
      mask.pixels[14 * 20 + x] = 3;
    }
    for (let y = 5; y <= 14; y++) {
      mask.pixels[y * 20 + 5] = 3;
      mask.pixels[y * 20 + 14] = 3;
    }
    for (let y = 6; y <= 13; y++) {
      for (let x = 6; x <= 13; x++) {
        enclosedRegionTags[y * 20 + x] = 1;
      }
    }
    for (let y = 7; y <= 12; y++) {
      mask.pixels[y * 20 + 12] = 3;
    }
    mask.enclosedRegionTags = enclosedRegionTags;

    const points = traceVisionCone({
      mask,
      frame: { centerX: 10, centerY: 10, renderScale: 1 },
      origin: { x: 10, y: 10 },
      directionDegrees: 0,
      apertureDegrees: 0,
      radius: 12,
    });

    expect(points[1].x).toBeCloseTo(2, 2);
  });

  it("rotates canonical defense wall coordinates for attack", () => {
    const mask = createMask(100, 100);
    for (let y = 0; y < mask.height; y++) {
      mask.pixels[y * mask.width + 40] = 3;
    }

    const points = traceVisionCone({
      mask,
      frame: { ...defaultFrame, rotate180: true },
      origin: { x: 50, y: 50 },
      directionDegrees: 0,
      apertureDegrees: 0,
      radius: 20,
    });

    expect(points[1].x).toBeCloseTo(9, 2);
  });

  it("rotates enclosure IDs with the canonical defense mask", () => {
    const mask = createMask(20, 20);
    const enclosedRegionTags = new Int32Array(20 * 20);
    for (let x = 1; x <= 7; x++) {
      mask.pixels[5 * 20 + x] = 3;
      mask.pixels[14 * 20 + x] = 3;
    }
    for (let y = 5; y <= 14; y++) {
      mask.pixels[y * 20 + 1] = 3;
      mask.pixels[y * 20 + 7] = 3;
    }
    for (let y = 6; y <= 13; y++) {
      for (let x = 2; x <= 6; x++) {
        enclosedRegionTags[y * 20 + x] = 1;
      }
    }
    mask.enclosedRegionTags = enclosedRegionTags;

    const points = traceVisionCone({
      mask,
      frame: { centerX: 10, centerY: 10, renderScale: 1, rotate180: true },
      origin: { x: 14, y: 10 },
      directionDegrees: 0,
      apertureDegrees: 0,
      radius: 8,
    });

    expect(points[1].x).toBeCloseTo(6);
  });

  it("keeps the requested radius when the path is unobstructed", () => {
    const points = traceVisionCone({
      mask: createMask(100, 100),
      frame: defaultFrame,
      origin: { x: 50, y: 50 },
      directionDegrees: 0,
      apertureDegrees: 0,
      radius: 20,
    });

    expect(points[1].x).toBeCloseTo(20);
    expect(points[1].y).toBeCloseTo(0);
  });

  it("adds angular samples as cone range grows to limit edge faceting", () => {
    const points = traceVisionCone({
      mask: createMask(400, 400),
      frame: { centerX: 200, centerY: 200, renderScale: 1 },
      origin: { x: 200, y: 200 },
      directionDegrees: 0,
      apertureDegrees: 90,
      radius: 100,
    });

    expect(points).toHaveLength(107);
  });
});
