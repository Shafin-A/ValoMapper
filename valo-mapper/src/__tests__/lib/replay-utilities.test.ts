import {
  getReplayUtilityPositionAtTime,
  getReplayUtilityTrailAtTime,
  REPLAY_UTILITY_MAX_SAMPLE_AGE_MS,
} from "@/lib/replay/utilities";
import { getReplayUtilityAbilityIcon } from "@/lib/replay/display";
import type { ReplayUtility } from "@/lib/replay/types";

const stationaryUtility: ReplayUtility = {
  id: "utility-0001",
  kind: "smoke",
  startTimeMs: 100,
  endTimeMs: 500,
  position: { x: 10, y: 20 },
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

  it("limits the mobile trail to samples observed by the playback time", () => {
    expect(getReplayUtilityTrailAtTime(mobileUtility, 150)).toEqual([
      { timeMs: 100, x: 10, y: 20 },
    ]);
  });
});
