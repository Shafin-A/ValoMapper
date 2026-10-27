import "fake-indexeddb/auto";

import {
  clearReplays,
  getReplay,
  listReplayMeta,
  MAX_STORED_REPLAYS,
  putReplay,
} from "@/lib/replay/idb";
import {
  getReplaySession,
  saveReplaySession,
} from "@/lib/replay/session-store";
import type { ReplayMatch, ReplayRound } from "@/lib/replay/types";

const buildRound = (): ReplayRound =>
  ({
    roundNumber: 1,
    winningTeam: "Red",
    roundResultCode: "Elimination",
    attackTeamId: "Red",
    durationMs: 1000,
    scoreAfterRound: { red: 0, blue: 0 },
    playerStats: [],
    eventLog: [],
    frames: [
      {
        timeMs: 0,
        players: [
          {
            puuid: "vrf-a",
            x: 1234,
            y: 5678,
            viewRadians: 1,
            hp: 100,
            credits: 0,
            alive: true,
          },
        ],
        spike: null,
      },
      {
        timeMs: 125,
        players: [
          {
            puuid: "vrf-a",
            x: 1300,
            y: 5700,
            viewRadians: 1.1,
            hp: 100,
            credits: 0,
            alive: true,
          },
        ],
        spike: null,
      },
    ],
  }) as unknown as ReplayRound;

const buildMatch = (
  replayId: string,
  source?: "vrf",
): ReplayMatch =>
  ({
    matchId: replayId,
    mapId: "lotus",
    mapName: "Lotus",
    queueLabel: "Replay",
    gameStartAt: "",
    totalRounds: 1,
    players: [],
    rounds: [buildRound()],
    source,
    replayId,
  }) as unknown as ReplayMatch;

beforeEach(async () => {
  await clearReplays();
});

describe("IndexedDB replay storage", () => {
  it("round-trips a real match with its frames", async () => {
    const match = buildMatch("real", "vrf");

    expect(await putReplay("real", match)).toBe(true);

    const stored = await getReplay("real");
    expect(stored?.replayId).toBe("real");
    expect(stored?.rounds[0].frames).toHaveLength(2);
    expect(stored?.rounds[0].frames[1].players[0].x).toBe(1300);
  });

  it("returns null for an unknown id", async () => {
    expect(await getReplay("missing")).toBeNull();
  });

  it("prunes the oldest matches beyond the policy", async () => {
    for (let index = 0; index < MAX_STORED_REPLAYS + 1; index += 1) {
      await putReplay(`replay-${index}`, buildMatch(`replay-${index}`, "vrf"));
    }

    const meta = await listReplayMeta();
    expect(meta.length).toBeLessThanOrEqual(MAX_STORED_REPLAYS);
    expect(meta.map((entry) => entry.replayId)).not.toContain("replay-0");
    expect(await getReplay("replay-0")).toBeNull();
  });
});

describe("replay session store", () => {
  it("stores and restores a match through IndexedDB when memory misses", async () => {
    await putReplay("from-idb", buildMatch("from-idb", "vrf"));

    const restored = await getReplaySession("from-idb");
    expect(restored?.rounds[0].frames).toHaveLength(2);
  });

  it("keeps frames for real replays but strips the demo seed", async () => {
    await saveReplaySession(buildMatch("real-session", "vrf"), "real-session");
    expect((await getReplay("real-session"))?.rounds[0].frames).toHaveLength(2);

    await saveReplaySession(buildMatch("demo-session"), "demo-session");
    expect((await getReplay("demo-session"))?.rounds[0].frames).toEqual([]);
  });
});
