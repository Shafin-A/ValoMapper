import {
  CANVAS_MAP_RENDER_SCALE,
  transformRiotWorldToCanvasPoint,
} from "@/lib/map-positioning";

describe("transformRiotWorldToCanvasPoint", () => {
  const baseTransform = {
    xMultiplier: 1,
    yMultiplier: 1,
    xScalarToAdd: 0,
    yScalarToAdd: 0,
    rotation: 0,
  };

  it("maps Riot world coordinates onto defense-side canvas coordinates", () => {
    const point = transformRiotWorldToCanvasPoint({
      position: { x: 0.25, y: 0.75 },
      transform: baseTransform,
      mapPosition: { x: 0, y: 0 },
      mapSide: "defense",
      mapSize: 1000,
      scale: CANVAS_MAP_RENDER_SCALE,
    });

    expect(point.x).toBeCloseTo(812.5);
    expect(point.y).toBeCloseTo(187.5);
  });

  it("mirrors transformed points for attack-side canvas coordinates", () => {
    const point = transformRiotWorldToCanvasPoint({
      position: { x: 0.25, y: 0.75 },
      transform: baseTransform,
      mapPosition: { x: 0, y: 0 },
      mapSide: "attack",
      mapSize: 1000,
      scale: CANVAS_MAP_RENDER_SCALE,
    });

    expect(point.x).toBeCloseTo(187.5);
    expect(point.y).toBeCloseTo(812.5);
  });

  it("applies map rotation around the rendered map center", () => {
    const point = transformRiotWorldToCanvasPoint({
      position: { x: 0.25, y: 0.75 },
      transform: {
        ...baseTransform,
        rotation: 90,
      },
      mapPosition: { x: 0, y: 0 },
      mapSide: "defense",
      mapSize: 1000,
      scale: CANVAS_MAP_RENDER_SCALE,
    });

    expect(point.x).toBeCloseTo(812.5);
    expect(point.y).toBeCloseTo(812.5);
  });
});
