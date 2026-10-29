import { MAP_SIZE } from "@/lib/consts";
import { CANVAS_MAP_RENDER_SCALE } from "@/lib/map-positioning";
import { getReplayPlayerState } from "@/lib/replay/display";
import {
  getReplayFrameAtTime,
  getReplayPlayerStateAtTime,
  REPLAY_MAX_INTERPOLATION_GAP_MS,
} from "@/lib/replay/frames";
import {
  getReplayMapPosition,
  isReplayPointOnMap,
  REPLAY_MAP_ICON_MARGIN,
} from "@/lib/replay/snapshot";
import type {
  ReplayFrame,
  ReplayFramePlayer,
  ReplayRound,
} from "@/lib/replay/types";

const player = (
  puuid: string,
  overrides: Partial<ReplayFramePlayer> = {},
): ReplayFramePlayer => ({
  puuid,
  x: 0,
  y: 0,
  viewRadians: 0,
  hp: 100,
  credits: 0,
  alive: true,
  ...overrides,
});

const frame = (
  timeMs: number,
  players: ReplayFramePlayer[],
  spike: ReplayFrame["spike"] = null,
): ReplayFrame => ({ timeMs, players, spike });

const roundWith = (frames: ReplayFrame[]): ReplayRound =>
  ({
    roundNumber: 1,
    winningTeam: "Red",
    roundResultCode: "Elimination",
    attackTeamId: "Red",
    durationMs: frames[frames.length - 1]?.timeMs ?? 0,
    scoreAfterRound: { red: 0, blue: 0 },
    playerStats: [],
    eventLog: [],
    frames,
  }) as unknown as ReplayRound;

describe("getReplayFrameAtTime", () => {
  it("interpolates positions across a normal sample gap", () => {
    const round = roundWith([
      frame(0, [player("a", { x: 0 })]),
      frame(125, [player("a", { x: 100 })]),
    ]);

    const midway = getReplayFrameAtTime(round, 62.5);
    expect(midway?.players[0].x).toBeCloseTo(50);
  });

  it("interpolates the short way around the angle seam", () => {
    const round = roundWith([
      frame(0, [player("a", { viewRadians: Math.PI * 1.9 })]),
      frame(125, [player("a", { viewRadians: Math.PI * 0.1 })]),
    ]);

    const midway = getReplayFrameAtTime(round, 62.5);
    const expected = 0; // 342° -> 18° crosses 0°, not 180°
    expect(Math.cos(midway?.players[0].viewRadians ?? 0)).toBeCloseTo(
      Math.cos(expected),
      3,
    );
  });

  it("hides a player across a gap longer than the interpolation limit", () => {
    const gap = REPLAY_MAX_INTERPOLATION_GAP_MS + 500;
    const round = roundWith([
      frame(0, [player("a", { x: 0 })]),
      frame(gap, [player("a", { x: 5000 })]),
    ]);

    expect(getReplayFrameAtTime(round, 0)?.players).toHaveLength(1);
    expect(getReplayFrameAtTime(round, 1)?.players).toHaveLength(0);
    expect(getReplayFrameAtTime(round, gap / 2)?.players).toHaveLength(0);
  });

  it("draws nothing before the round's first frame", () => {
    const round = roundWith([frame(5000, [player("a")])]);

    expect(getReplayFrameAtTime(round, 0)?.players).toHaveLength(0);
    expect(getReplayFrameAtTime(round, 4999)?.players).toHaveLength(0);
    expect(getReplayFrameAtTime(round, 5000)?.players).toHaveLength(1);
  });

  it("does not draw a player before their first sample", () => {
    const round = roundWith([
      frame(0, [player("a")]),
      frame(125, [player("a"), player("b", { x: 300 })]),
    ]);

    const midway = getReplayFrameAtTime(round, 62.5);
    expect(midway?.players.map((entry) => entry.puuid)).toEqual(["a"]);

    const atSample = getReplayFrameAtTime(round, 125);
    expect(atSample?.players.map((entry) => entry.puuid)).toEqual(["a", "b"]);
  });

  it("drops a player after their last sample", () => {
    const round = roundWith([
      frame(0, [player("a"), player("b")]),
      frame(125, [player("a"), player("b")]),
      frame(250, [player("a")]),
    ]);

    expect(
      getReplayFrameAtTime(round, 250)?.players.map((entry) => entry.puuid),
    ).toEqual(["a"]);
  });

  it("carries the previous state rather than interpolating it", () => {
    const round = roundWith([
      frame(0, [player("a", { x: 0, hp: 80, credits: 900, alive: true })]),
      frame(125, [player("a", { x: 100, hp: 0, credits: 0, alive: false })]),
    ]);

    const midway = getReplayFrameAtTime(round, 62.5);
    expect(midway?.players[0].hp).toBe(80);
    expect(midway?.players[0].credits).toBe(900);
    expect(midway?.players[0].alive).toBe(true);
  });

  it("cuts across a 1 ms teleport pair without a visible slide", () => {
    const round = roundWith([
      frame(124, [player("a", { x: 0 })]),
      frame(125, [player("a", { x: 5000 })]),
    ]);

    expect(getReplayFrameAtTime(round, 124)?.players[0].x).toBe(0);
    expect(getReplayFrameAtTime(round, 125)?.players[0].x).toBe(5000);
  });
});

describe("getReplayFrameAtTime spike custody", () => {
  it("interpolates while the state and carrier are unchanged", () => {
    const round = roundWith([
      frame(0, [], { x: 0, y: 0, state: "carried", carrierPuuid: "a" }),
      frame(125, [], { x: 100, y: 50, state: "carried", carrierPuuid: "a" }),
    ]);

    const midway = getReplayFrameAtTime(round, 62.5);
    expect(midway?.spike).toMatchObject({
      x: 50,
      y: 25,
      state: "carried",
      carrierPuuid: "a",
    });
  });

  it("snaps instead of sliding when the carrier changes", () => {
    const round = roundWith([
      frame(0, [], { x: 0, y: 0, state: "carried", carrierPuuid: "a" }),
      frame(125, [], { x: 100, y: 0, state: "carried", carrierPuuid: "b" }),
    ]);

    expect(getReplayFrameAtTime(round, 62.5)?.spike).toMatchObject({
      x: 0,
      state: "carried",
      carrierPuuid: "a",
    });
  });

  it("snaps instead of sliding when the state changes", () => {
    const round = roundWith([
      frame(0, [], { x: 0, y: 0, state: "carried", carrierPuuid: "a" }),
      frame(125, [], { x: 100, y: 0, state: "planted", site: "A" }),
    ]);

    expect(getReplayFrameAtTime(round, 62.5)?.spike).toMatchObject({
      x: 0,
      state: "carried",
      carrierPuuid: "a",
    });
  });

  it("keeps the 500 ms gap rule for the spike", () => {
    const gap = REPLAY_MAX_INTERPOLATION_GAP_MS + 500;
    const round = roundWith([
      frame(0, [], { x: 0, y: 0, state: "carried", carrierPuuid: "a" }),
      frame(gap, [], { x: 100, y: 0, state: "carried", carrierPuuid: "a" }),
    ]);

    expect(getReplayFrameAtTime(round, gap / 2)?.spike).toMatchObject({
      x: 0,
      carrierPuuid: "a",
    });
  });

  it("keeps the plant site while interpolating post-plant movement", () => {
    const round = roundWith([
      frame(0, [], { x: 0, y: 0, state: "planted", site: "B" }),
      frame(125, [], { x: 100, y: 0, state: "planted", site: "B" }),
    ]);

    expect(getReplayFrameAtTime(round, 62.5)?.spike).toMatchObject({
      x: 50,
      state: "planted",
      site: "B",
    });
  });
});

describe("getReplayPlayerStateAtTime", () => {
  it("returns the latest sample at or before the requested time", () => {
    const round = roundWith([
      frame(0, [player("a", { hp: 100, credits: 900 })]),
      frame(125, [player("a", { hp: 80, credits: 800 })]),
    ]);

    expect(getReplayPlayerStateAtTime(round, "a", 62)?.hp).toBe(100);
    expect(getReplayPlayerStateAtTime(round, "a", 125)?.hp).toBe(80);
    expect(getReplayPlayerStateAtTime(round, "a", 500)?.hp).toBe(80);
  });

  it("keeps a dead player dead after they stop appearing in frames", () => {
    const round = roundWith([
      frame(0, [player("a", { hp: 100, alive: true })]),
      frame(125, [player("a", { hp: 0, alive: false })]),
      frame(250, []),
    ]);

    const state = getReplayPlayerStateAtTime(round, "a", 250);
    expect(state?.hp).toBe(0);
    expect(state?.alive).toBe(false);
  });

  it("switches weapon and armour at the sample time, not before", () => {
    const round = roundWith([
      frame(0, [player("a", { weaponId: "CLASSIC", armorPoints: 25 })]),
      frame(125, [player("a", { weaponId: "VANDAL", armorPoints: 50 })]),
    ]);

    expect(getReplayPlayerStateAtTime(round, "a", 124)?.weaponId).toBe(
      "CLASSIC",
    );
    expect(getReplayPlayerStateAtTime(round, "a", 125)?.weaponId).toBe(
      "VANDAL",
    );
    expect(getReplayPlayerStateAtTime(round, "a", 124)?.armorPoints).toBe(25);
    expect(getReplayPlayerStateAtTime(round, "a", 125)?.armorPoints).toBe(50);
  });

  it("returns null when the player has no sample at or before the time", () => {
    const round = roundWith([
      frame(125, [player("a")]),
      frame(250, [player("a")]),
    ]);

    expect(getReplayPlayerStateAtTime(round, "a", 0)).toBeNull();
    expect(getReplayPlayerStateAtTime(round, "missing", 250)).toBeNull();
  });

  it("does not reuse another round's final state", () => {
    const first = roundWith([
      frame(0, [player("a", { hp: 12, alive: false })]),
    ]);
    const second = roundWith([
      frame(0, [player("a", { hp: 100, alive: true })]),
    ]);

    expect(getReplayPlayerStateAtTime(first, "a", 0)?.alive).toBe(false);
    expect(getReplayPlayerStateAtTime(second, "a", 0)?.alive).toBe(true);
  });
});

describe("isReplayPointOnMap", () => {
  const mapPosition = getReplayMapPosition();
  const center = {
    x: mapPosition.x + MAP_SIZE / 2,
    y: mapPosition.y + MAP_SIZE / 2,
  };
  const halfExtent = (MAP_SIZE * CANVAS_MAP_RENDER_SCALE) / 2;

  it("accepts the map centre", () => {
    expect(isReplayPointOnMap({ point: center })).toBe(true);
  });

  it("accepts a point just inside the rendered map image", () => {
    expect(
      isReplayPointOnMap({
        point: { x: center.x + halfExtent - 1, y: center.y },
      }),
    ).toBe(true);
  });

  it("rejects an Iso-arena-style point outside the map", () => {
    expect(
      isReplayPointOnMap({
        point: { x: center.x + halfExtent + REPLAY_MAP_ICON_MARGIN + 1, y: center.y },
      }),
    ).toBe(false);
  });
});

describe("getReplayPlayerState", () => {
  it("treats a player with no sample as having no state yet, not as dead", () => {
    // A round can start before the player's first movement sample arrives. The
    // fallback is a full bar rather than a death.
    const state = getReplayPlayerState(null);
    expect(state.hp).toBe(100);
    expect(state.alive).toBe(true);
    expect(state.credits).toBe(0);
  });

  it("prefers the frame's own state when the player is present", () => {
    const state = getReplayPlayerState(
      player("a", { hp: 0, alive: false, credits: 50 }),
    );
    expect(state.hp).toBe(0);
    expect(state.alive).toBe(false);
    expect(state.credits).toBe(50);
  });
});
