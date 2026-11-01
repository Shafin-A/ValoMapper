import {
  CANVAS_MAP_RENDER_SCALE,
  transformRiotWorldToCanvasPoint,
} from "@/lib/map-positioning";
import { getMapCallouts, MAP_SIZE } from "@/lib/consts";
import {
  getReplayMapPosition,
  isReplayPointOnMap,
} from "@/lib/replay/snapshot";

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

  it("places calibrated 13.08 Lotus utility spawns on the rendered map", () => {
    const transform = getMapCallouts("lotus");
    if (!transform) {
      throw new Error("Missing Lotus callout transform");
    }

    const mapPosition = getReplayMapPosition();
    const samples = [
      {
        position: { x: 6431.3, y: -5267.8 },
        expected: { x: 1030.62, y: 556.63 },
      },
      {
        position: { x: 6505.5, y: 4043 },
        expected: { x: 192.64, y: 563.31 },
      },
      {
        position: { x: 5684.7, y: -66.3 },
        expected: { x: 562.48, y: 489.43 },
      },
      {
        position: { x: 6788.1, y: -4616.4 },
        expected: { x: 971.99, y: 588.74 },
      },
    ];

    for (const { position, expected } of samples) {
      const defensePoint = transformRiotWorldToCanvasPoint({
        position,
        transform,
        mapPosition,
        mapSide: "defense",
      });
      expect(defensePoint.x - mapPosition.x).toBeCloseTo(expected.x);
      expect(defensePoint.y - mapPosition.y).toBeCloseTo(expected.y);
      expect(isReplayPointOnMap({ point: defensePoint })).toBe(true);

      const attackPoint = transformRiotWorldToCanvasPoint({
        position,
        transform,
        mapPosition,
        mapSide: "attack",
      });
      expect(attackPoint.x).toBeCloseTo(
        2 * mapPosition.x + MAP_SIZE - defensePoint.x,
      );
      expect(attackPoint.y).toBeCloseTo(
        2 * mapPosition.y + MAP_SIZE - defensePoint.y,
      );
      expect(isReplayPointOnMap({ point: attackPoint })).toBe(true);
    }
  });
});
