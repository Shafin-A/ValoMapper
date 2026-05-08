import {
  getTraversalDurationSeconds,
  PIXELS_PER_METER,
  TRAVERSAL_TIME_BY_OPTION,
} from "@/lib/consts";

describe("traversal-time", () => {
  it("treats traversal config speeds as meters per second", () => {
    const traversalOption = TRAVERSAL_TIME_BY_OPTION["knife-run"];
    const tenMetersInCanvasUnits = PIXELS_PER_METER * 10;

    expect(
      getTraversalDurationSeconds(tenMetersInCanvasUnits, "knife-run"),
    ).toBeCloseTo(10 / traversalOption.metersPerSecond);
  });

  it("returns null when the configured speed is invalid", () => {
    const originalMetersPerSecond =
      TRAVERSAL_TIME_BY_OPTION["knife-run"].metersPerSecond;

    TRAVERSAL_TIME_BY_OPTION["knife-run"].metersPerSecond = 0;

    expect(getTraversalDurationSeconds(100, "knife-run")).toBeNull();

    TRAVERSAL_TIME_BY_OPTION["knife-run"].metersPerSecond =
      originalMetersPerSecond;
  });
});
