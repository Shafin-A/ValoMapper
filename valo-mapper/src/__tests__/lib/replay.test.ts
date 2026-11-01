import {
  buildReplayFrames,
  getActiveEventIndex,
  restoreReplayFrames,
  stripReplayFrames,
} from "@/lib/replay/frames";
import {
  getReplayAbilityDisplays,
  getReplayArmor,
  getReplayPlayerState,
} from "@/lib/replay/display";
import {
  buildReplayInitialState,
  buildReplaySnapshotState,
} from "@/lib/replay/snapshot";
import { defaultIconSettings } from "@/contexts/settings-context";
import { getToolIconAttachmentPosition } from "@/lib/tool-icon";
import { VISION_CONE_MAX_LENGTH } from "@/lib/vision-cone-utils";
import type {
  ReplayFrame,
  ReplayMatch,
  ReplayRound,
  ReplaySeedRound,
} from "@/lib/replay/types";
import type {
  MatchPlayerSummary,
  UndoableState,
} from "@/lib/types";

const players: MatchPlayerSummary[] = [
  {
    puuid: "blue-1",
    gameName: "BlueOne",
    tagLine: "NA1",
    teamId: "Blue",
    characterId: "",
    characterName: "Jett",
  },
  {
    puuid: "red-1",
    gameName: "RedOne",
    tagLine: "NA1",
    teamId: "Red",
    characterId: "",
    characterName: "Jett",
  },
  {
    puuid: "red-2",
    gameName: "RedTwo",
    tagLine: "NA1",
    teamId: "Red",
    characterId: "",
    characterName: "Omen",
  },
];

const seedRound: ReplaySeedRound = {
  roundNumber: 1,
  winningTeam: "Blue",
  roundResultCode: "Elimination",
  attackTeamId: "Red",
  scoreAfterRound: { red: 0, blue: 1 },
  durationMs: 10_000,
  playerStats: [
    {
      puuid: "blue-1",
      score: 0,
      kills: 1,
      deaths: 0,
      assists: 0,
      economy: { loadoutValue: 800, remaining: 900 },
      weaponId: "weapon-blue",
      incomingDamage: 0,
      abilityCasts: { Grenade: 2_000 },
    },
    {
      puuid: "red-1",
      score: 0,
      kills: 0,
      deaths: 1,
      assists: 0,
      economy: { loadoutValue: 700, remaining: 100 },
      weaponId: "weapon-red",
      incomingDamage: 100,
      abilityCasts: {},
    },
    {
      puuid: "red-2",
      score: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      economy: { loadoutValue: 700, remaining: 100 },
      weaponId: "weapon-red",
      incomingDamage: 0,
      abilityCasts: {},
    },
  ],
  eventLog: [
    {
      eventType: "spike_planted",
      timeSinceRoundStartMillis: 3_000,
      planterPuuid: "blue-1",
      plantLocation: { x: 1_000, y: 1_000 },
      plantPlayerLocations: [
        {
          puuid: "blue-1",
          viewRadians: 0,
          location: { x: 1_000, y: 1_000 },
        },
      ],
    },
    {
      eventType: "kill",
      timeSinceRoundStartMillis: 5_000,
      killerPuuid: "blue-1",
      victimPuuid: "red-1",
      victimLocation: { x: 1_100, y: 1_100 },
      playerLocations: [
        {
          puuid: "blue-1",
          viewRadians: 0,
          location: { x: 1_050, y: 1_050 },
        },
        {
          puuid: "red-1",
          viewRadians: Math.PI,
          location: { x: 1_100, y: 1_100 },
        },
      ],
    },
  ],
};

const frame: ReplayFrame = {
  timeMs: 6_000,
  players: [
    {
      puuid: "blue-1",
      x: 1_050,
      y: 1_050,
      viewRadians: 0,
      hp: 100,
      credits: 900,
      weaponId: "weapon-blue",
      alive: true,
    },
    {
      puuid: "red-1",
      x: 1_100,
      y: 1_100,
      viewRadians: Math.PI,
      hp: 0,
      credits: 100,
      weaponId: "weapon-red",
      alive: false,
    },
    {
      puuid: "red-2",
      x: 900,
      y: 900,
      viewRadians: Math.PI / 2,
      hp: 100,
      credits: 100,
      weaponId: "weapon-red",
      alive: true,
    },
  ],
  spike: { x: 1_000, y: 1_000, state: "planted" },
};

const buildRound = (frames: ReplayFrame[]): ReplayRound => ({
  ...seedRound,
  frames,
});

const buildMatch = (round: ReplayRound): ReplayMatch => ({
  matchId: "match-1",
  mapId: "pearl",
  mapName: "Pearl",
  queueLabel: "Competitive",
  gameStartAt: "2024-01-01T00:00:00Z",
  totalRounds: 1,
  players,
  viewer: null,
  rounds: [round],
});

const buildCurrentState = (): UndoableState => ({
  phases: [
    {
      agentsOnCanvas: [
        {
          id: "replay-agent-9",
          name: "Jett",
          role: "Duelist",
          isAlly: true,
          x: 10,
          y: 10,
        },
        {
          id: "user-agent-1",
          name: "Omen",
          role: "Controller",
          isAlly: false,
          x: 20,
          y: 20,
        },
      ],
      abilitiesOnCanvas: [],
      drawLines: [
        {
          id: "draw-1",
          tool: "pencil",
          points: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
          ],
          color: "#fff",
          size: 2,
          isDashed: false,
          isArrowHead: false,
        },
      ],
      connectingLines: [],
      textsOnCanvas: [],
      imagesOnCanvas: [],
      toolIconsOnCanvas: [],
    },
  ],
  selectedMap: { id: "pearl", text: "Pearl", textColor: "#fff" },
  mapSide: "defense",
  currentPhaseIndex: 0,
  editedPhases: [0],
});

describe("getReplayArmor", () => {
  it("maps armor ids to their shield values", () => {
    expect(getReplayArmor("822BCAB2-40A2-324E-C137-E09195AD7692")?.value).toBe(50);
    expect(getReplayArmor("4dec83d5-4902-9ab3-bed6-a7a390761157")?.value).toBe(25);
    expect(getReplayArmor("B1B9086D-41BD-A516-5D29-E3B34A6F1644")?.value).toBe(25);
  });

  it("returns null for unknown or missing armor", () => {
    expect(getReplayArmor()).toBeNull();
    expect(getReplayArmor("unknown")).toBeNull();
  });
});

describe("getReplayAbilityDisplays", () => {
  it("exposes key, charges and cast time for basic abilities and the ultimate", () => {
    const abilities = getReplayAbilityDisplays("Chamber", {
      Grenade: 5000,
      Ability2: 9000,
    });
    const bySlot = new Map(abilities.map((ability) => [ability.slot, ability]));

    expect(bySlot.get("Grenade")?.key).toBe("C");
    expect(bySlot.get("Ability1")?.key).toBe("Q");
    expect(bySlot.get("Ability2")?.key).toBe("E");
    expect(bySlot.get("Ultimate")?.key).toBe("X");
    expect(bySlot.get("Grenade")?.charges).toBe(1);
    expect(bySlot.get("Ability1")?.charges).toBe(8);
    expect(bySlot.get("Ability2")?.charges).toBe(1);
    expect(bySlot.get("Ultimate")?.charges).toBeUndefined();
    expect(bySlot.get("Grenade")?.castTimeMs).toBe(5000);
    expect(bySlot.get("Ability2")?.castTimeMs).toBe(9000);
    expect(bySlot.get("Ability1")?.castTimeMs).toBeUndefined();
  });
});

describe("getReplayPlayerState", () => {
  it("prefers the live frame values over the round fallback", () => {
    const state = getReplayPlayerState(
      {
        puuid: "blue-1",
        x: 0,
        y: 0,
        viewRadians: 0,
        hp: 62,
        credits: 1400,
        weaponId: "VANDAL",
        armorId: "4dec83d5-4902-9ab3-bed6-a7a390761157",
        alive: true,
      },
      { credits: 0, weaponId: "CLASSIC" },
    );

    expect(state).toMatchObject({
      hp: 62,
      alive: true,
      credits: 1400,
      weaponId: "VANDAL",
      armorId: "4dec83d5-4902-9ab3-bed6-a7a390761157",
    });
  });

  it("falls back to round stats when there is no frame player", () => {
    const state = getReplayPlayerState(null, {
      credits: 900,
      weaponId: "CLASSIC",
      armorId: "822bcab2-40a2-324e-c137-e09195ad7692",
    });

    // Absence from a frame means "no positional sample", not "dead".
    expect(state).toMatchObject({
      hp: 100,
      alive: true,
      credits: 900,
      weaponId: "CLASSIC",
      armorId: "822bcab2-40a2-324e-c137-e09195ad7692",
    });
  });
});

describe("buildReplayInitialState", () => {
  it("creates a single empty phase on the fixed replay side", () => {
    const state = buildReplayInitialState({
      selectedMap: { id: "pearl", text: "Pearl", textColor: "#fff" },
    });

    expect(state.mapSide).toBe("defense");
    expect(state.phases).toHaveLength(1);
    expect(state.phases[0].agentsOnCanvas).toHaveLength(0);
    expect(state.phases[0].drawLines).toHaveLength(0);
  });
});

describe("buildReplaySnapshotState", () => {
  it("keeps user drawings while replacing replay entities with the current frame", () => {
    const round = buildRound([frame]);
    const match = buildMatch(round);
    const snapshot = buildReplaySnapshotState({
      match,
      round,
      frame,
      currentState: buildCurrentState(),
    });
    const phase = snapshot.phases[0];
    const agentIds = phase.agentsOnCanvas.map((agent) => agent.id);

    expect(agentIds).toContain("replay-agent-0");
    expect(agentIds).toContain("replay-agent-1");
    expect(agentIds).toContain("user-agent-1");
    expect(agentIds).not.toContain("replay-agent-9");

    expect(phase.drawLines.map((line) => line.id)).toEqual(["draw-1"]);
    expect(phase.abilitiesOnCanvas.map((ability) => ability.id)).toEqual([
      "replay-agent-0-cone",
      "replay-agent-2-cone",
    ]);
    expect(
      phase.abilitiesOnCanvas.every(
        (ability) => ability.currentLength === VISION_CONE_MAX_LENGTH,
      ),
    ).toBe(true);
    expect(phase.toolIconsOnCanvas.map((icon) => icon.id)).toEqual([
      "replay-spike-1",
    ]);
    expect(phase.connectingLines.map((line) => line.id)).toEqual([
      "replay-kill-1-1",
    ]);
    expect(snapshot.selectedMap.id).toBe("pearl");
    expect(snapshot.mapSide).toBe("defense");
  });

  it("copies dead agents unless hide dead agents is enabled", () => {
    const deathFrame = { ...frame, timeMs: 6_000 };
    const laterFrame = {
      ...frame,
      timeMs: 7_000,
      players: frame.players.filter((player) => player.puuid !== "red-1"),
    };
    const round = buildRound([deathFrame, laterFrame]);
    const match = buildMatch(round);
    const currentState = buildCurrentState();

    const snapshot = buildReplaySnapshotState({
      match,
      round,
      frame: laterFrame,
      currentState,
    });
    expect(
      snapshot.phases[0].agentsOnCanvas.find(
        (agent) => agent.id === "replay-agent-1",
      ),
    ).toMatchObject({ isGray: true });

    const hidden = buildReplaySnapshotState({
      match,
      round,
      frame: laterFrame,
      currentState,
      hideDeadAgents: true,
    });
    expect(
      hidden.phases[0].agentsOnCanvas.some(
        (agent) => agent.id === "replay-agent-1",
      ),
    ).toBe(false);
  });

  it("attaches equipped weapons to copied agents unless weapons are hidden", () => {
    const weaponFrame: ReplayFrame = {
      ...frame,
      players: frame.players.map((player) =>
        player.puuid === "blue-1"
          ? {
              ...player,
              weaponId: "9C82E19D-4575-0200-1A81-3EACF00CF872",
            }
          : player,
      ),
    };
    const round = buildRound([weaponFrame]);
    const match = buildMatch(round);
    const currentState = buildCurrentState();

    const snapshot = buildReplaySnapshotState({
      match,
      round,
      frame: weaponFrame,
      currentState,
    });
    const phase = snapshot.phases[0];
    const weapon = phase.toolIconsOnCanvas.find(
      (icon) => icon.id === "replay-weapon-0",
    );
    const agent = phase.agentsOnCanvas.find(
      (item) => item.id === "replay-agent-0",
    );

    if (!weapon || !agent) {
      throw new Error("Expected an attached weapon and its agent");
    }

    expect(weapon).toMatchObject({
      name: "vandal",
      attachedToId: "replay-agent-0",
      ...getToolIconAttachmentPosition(
        weapon,
        agent.x,
        agent.y,
        defaultIconSettings,
      ),
    });

    const hidden = buildReplaySnapshotState({
      match,
      round,
      frame: weaponFrame,
      currentState,
      hideAgentWeapons: true,
    });
    expect(
      hidden.phases[0].toolIconsOnCanvas.some((icon) =>
        icon.id.startsWith("replay-weapon-"),
      ),
    ).toBe(false);
  });

  it("attaches a carried spike to its carrier in the copied lobby", () => {
    const carrierFrame: ReplayFrame = {
      ...frame,
      spike: {
        x: 1_050,
        y: 1_050,
        state: "carried",
        carrierPuuid: "blue-1",
      },
    };
    const round = buildRound([carrierFrame]);
    const match = buildMatch(round);

    const snapshot = buildReplaySnapshotState({
      match,
      round,
      frame: carrierFrame,
      currentState: buildCurrentState(),
    });
    const phase = snapshot.phases[0];
    const spike = phase.toolIconsOnCanvas.find(
      (icon) => icon.id === "replay-spike-1",
    );
    const agent = phase.agentsOnCanvas.find(
      (item) => item.id === "replay-agent-0",
    );

    if (!spike || !agent) {
      throw new Error("Expected an attached spike and its carrier");
    }

    expect(spike).toMatchObject({
      attachedToId: "replay-agent-0",
      ...getToolIconAttachmentPosition(
        spike,
        agent.x,
        agent.y,
        defaultIconSettings,
      ),
    });
  });

  it("omits vision cones when vision is hidden", () => {
    const round = buildRound([frame]);
    const snapshot = buildReplaySnapshotState({
      match: buildMatch(round),
      round,
      frame,
      currentState: buildCurrentState(),
      showVisionCones: false,
    });

    expect(snapshot.phases[0].abilitiesOnCanvas).toHaveLength(0);
  });
});

describe("getActiveEventIndex", () => {
  it("returns the latest event at or before the current time", () => {
    expect(getActiveEventIndex(seedRound, 0)).toBeNull();
    expect(getActiveEventIndex(seedRound, 4_000)).toBe(0);
    expect(getActiveEventIndex(seedRound, 5_000)).toBe(1);
  });
});

describe("replay frames", () => {
  it("generates frames and can round-trip them through storage", () => {
    const frames = buildReplayFrames(seedRound, players);
    const match = buildMatch(buildRound(frames));

    expect(frames.length).toBeGreaterThan(0);
    expect(frames[frames.length - 1].timeMs).toBe(seedRound.durationMs);

    const stripped = stripReplayFrames(match);
    expect(stripped.rounds[0].frames).toHaveLength(0);

    const restored = restoreReplayFrames(stripped);
    expect(restored.rounds[0].frames).toHaveLength(frames.length);
  });
});
