import {
  getReplayUtilityLengthAtTime,
  getReplayUtilityVisionYawAtTime,
  getReplayUtilityPositionAtTime,
  getReplayUtilityTrailAtTime,
  REPLAY_UTILITY_MAX_SAMPLE_AGE_MS,
} from "@/lib/replay/utilities";
import { getReplayUtilityAbilityIcon } from "@/lib/replay/display";
import { AGENT_ICON_CONFIGS } from "@/lib/consts/configs/agent-icon/consts";
import type { ReplayUtility } from "@/lib/replay/types";

const stationaryUtility: ReplayUtility = {
  id: "utility-0001",
  kind: "smoke",
  startTimeMs: 100,
  endTimeMs: 500,
  position: { x: 10, y: 20 },
};

const growingWallUtility: ReplayUtility = {
  id: "utility-0003",
  kind: "wall",
  startTimeMs: 100,
  endTimeMs: 1100,
  position: { x: 0, y: 0 },
  length: 20,
  lengthSamples: [
    { timeMs: 200, length: 0 },
    { timeMs: 600, length: 10 },
    { timeMs: 1000, length: 20 },
  ],
};

const mobileUtility: ReplayUtility = {
  id: "utility-0002",
  kind: "mobile",
  startTimeMs: 0,
  endTimeMs: 1000,
  position: { x: 0, y: 0 },
  samples: [
    { timeMs: 100, x: 10, y: 20 },
    { timeMs: 200, x: 30, y: 40 },
  ],
};

describe("replay utility playback", () => {
  it.each([
    ["dark_cover", "/agents/omen/dark_cover.png"],
    ["ruse", "/agents/clove/ruse.png"],
    ["cloudburst", "/agents/jett/cloudburst.png"],
    ["hot_hands", "/agents/phoenix/hot_hands.png"],
    ["blaze", "/agents/phoenix/blaze.png"],
    ["trademark", "/agents/chamber/trademark.png"],
    ["barrier_orb", "/agents/sage/barrier_orb.png"],
    ["prowler", "/agents/fade/prowler.png"],
    ["boom_bot", "/agents/raze/boom_bot.png"],
    ["zeropoint", "/agents/kayo/zeropoint.png"],
    ["mpulse_concuss", "/agents/miks/mpulse_heal.png"],
  ])("resolves %s to its ValoMapper ability artwork", (abilityId, src) => {
    expect(getReplayUtilityAbilityIcon(abilityId)).toMatchObject({
      id: abilityId,
      src,
    });
  });

  it("does not invent artwork for an unknown ability id", () => {
    expect(getReplayUtilityAbilityIcon("unknown-ability")).toBeNull();
  });

  it("uses a replay-only circle action for Viper's Pit", () => {
    expect(getReplayUtilityAbilityIcon("vipers_pit")).toMatchObject({
      id: "vipers_pit",
      src: "/agents/viper/viper's_pit.png",
      action: "viper_pit",
    });
    expect(
      AGENT_ICON_CONFIGS.Viper.find((ability) => ability.id === "vipers_pit")
        ?.action,
    ).toBe("icon");
  });

  it.each([
    "mosh_pit",
    "dizzy",
    "haunt",
    "seize",
    "aftershock",
    "flashpoint",
    "gravnet",
    "barrier_mesh",
    "special_delivery",
    "paint_shells",
    "blast_pack",
    "showstopper",
    "flashdrive",
    "zeropoint",
    "guiding_light",
    "nanoswarm",
    "undercut",
    "shock_bolt",
    "recon_bolt",
    "mpulse",
    "mpulse_concuss",
    "razorvine",
    "hot_hands",
    "curveball",
    "blaze",
    "stim_beacon",
    "incendiary",
    "meddle",
    "paranoia",
    "slow_orb",
    "leer",
    "dark_cover",
    "cloudburst",
    "blindside",
  ])("resolves projectile trail ability %s to ValoMapper artwork", (abilityId) => {
    expect(getReplayUtilityAbilityIcon(abilityId)).not.toBeNull();
  });

  it("shows stationary utilities for their half-open lifetime", () => {
    expect(getReplayUtilityPositionAtTime(stationaryUtility, 99)).toBeNull();
    expect(getReplayUtilityPositionAtTime(stationaryUtility, 100)).toEqual({
      x: 10,
      y: 20,
    });
    expect(getReplayUtilityPositionAtTime(stationaryUtility, 499)).toEqual({
      x: 10,
      y: 20,
    });
    expect(getReplayUtilityPositionAtTime(stationaryUtility, 500)).toBeNull();
  });

  it("seeks mobile actors to the latest observed sample without extrapolating", () => {
    expect(getReplayUtilityPositionAtTime(mobileUtility, 99)).toBeNull();
    expect(getReplayUtilityPositionAtTime(mobileUtility, 150)).toEqual({
      timeMs: 100,
      x: 10,
      y: 20,
    });
    expect(
      getReplayUtilityPositionAtTime(
        mobileUtility,
        200 + REPLAY_UTILITY_MAX_SAMPLE_AGE_MS,
      ),
    ).toEqual({ timeMs: 200, x: 30, y: 40 });
    expect(
      getReplayUtilityPositionAtTime(
        mobileUtility,
        201 + REPLAY_UTILITY_MAX_SAMPLE_AGE_MS,
      ),
    ).toBeNull();
  });

  it("interpolates a moving wall between its movement samples", () => {
    const movingWall: ReplayUtility = {
      id: "utility-moving-wall",
      kind: "wall",
      startTimeMs: 0,
      endTimeMs: 1000,
      position: { x: 0, y: 0 },
      yaw: 0,
      samples: [
        { timeMs: 100, x: 0, y: 0 },
        { timeMs: 300, x: 40, y: 20 },
      ],
    };

    expect(getReplayUtilityPositionAtTime(movingWall, 50)).toMatchObject({
      x: 0,
      y: 0,
    });
    expect(getReplayUtilityPositionAtTime(movingWall, 200)).toMatchObject({
      x: 20,
      y: 10,
    });
    expect(getReplayUtilityPositionAtTime(movingWall, 300)).toMatchObject({
      x: 40,
      y: 20,
    });
    expect(getReplayUtilityPositionAtTime(movingWall, 500)).toMatchObject({
      x: 40,
      y: 20,
    });
  });

  it("limits the mobile trail to samples observed by the playback time", () => {
    expect(getReplayUtilityTrailAtTime(mobileUtility, 150)).toEqual([
      { timeMs: 100, x: 10, y: 20 },
    ]);
  });

  it("grows a wall from its length samples and holds the final length", () => {
    expect(getReplayUtilityLengthAtTime(growingWallUtility, 100)).toBe(0);
    expect(getReplayUtilityLengthAtTime(growingWallUtility, 200)).toBe(0);
    expect(getReplayUtilityLengthAtTime(growingWallUtility, 400)).toBe(5);
    expect(getReplayUtilityLengthAtTime(growingWallUtility, 600)).toBe(10);
    expect(getReplayUtilityLengthAtTime(growingWallUtility, 800)).toBe(15);
    expect(getReplayUtilityLengthAtTime(growingWallUtility, 1000)).toBe(20);
    expect(getReplayUtilityLengthAtTime(growingWallUtility, 1500)).toBe(20);
  });

  it("falls back to the static wall length without length samples", () => {
    const staticWall = { ...growingWallUtility, lengthSamples: undefined };

    expect(getReplayUtilityLengthAtTime(staticWall, 400)).toBe(20);
    expect(getReplayUtilityLengthAtTime(stationaryUtility, 200)).toBeUndefined();
  });

  it("interpolates Spycam yaw while possessed and hides the cone after unpossessing", () => {
    const vision = [
      { timeMs: 100, yaw: 350, active: true },
      { timeMs: 300, yaw: 10, active: true },
      { timeMs: 400, yaw: 10, active: false },
    ];

    expect(getReplayUtilityVisionYawAtTime(vision, 50)).toBeNull();
    expect(getReplayUtilityVisionYawAtTime(vision, 100)).toBe(350);
    expect(getReplayUtilityVisionYawAtTime(vision, 200)).toBe(0);
    expect(getReplayUtilityVisionYawAtTime(vision, 300)).toBe(10);
    expect(getReplayUtilityVisionYawAtTime(vision, 400)).toBeNull();
  });
});
