import {
  filterMatchesByQueue,
  formatTimeSinceRoundStart,
  getAgentImageSrc,
  getKillEventImage,
  getMapImageSrc,
  getPlayerAgentIconSrc,
  getPlayerSummary,
  getResultLabel,
  getRoundOutcomeIconSrc,
  getRoundOutcomeText,
  isMatchQueueFilter,
  MatchKillEvent,
  MatchPlayers,
} from "@/lib/matches";
import { MatchPreview } from "@/lib/types";

const players: MatchPlayers = [
  {
    puuid: "player-astra",
    gameName: "Astral",
    tagLine: "EUW",
    teamId: "Blue",
    characterId: "astra-id",
    characterName: "Astra",
  },
  {
    puuid: "player-jett",
    gameName: "Wind",
    tagLine: "NA",
    teamId: "Red",
    characterId: "jett-id",
    characterName: "Jett",
  },
];

const createMatch = (overrides: Partial<MatchPreview> = {}): MatchPreview => ({
  matchId: "match-1",
  playedAt: 1,
  queueLabel: "Competitive",
  mapId: "ascent",
  mapName: "Ascent",
  result: "Win",
  teamScore: 13,
  enemyScore: 9,
  kills: 20,
  deaths: 10,
  assists: 5,
  personalScore: 4200,
  agentId: "astra-id",
  agentName: "Astra",
  ...overrides,
});

const createKillEvent = (
  overrides: Partial<MatchKillEvent> = {},
): MatchKillEvent => ({
  eventType: "kill",
  timeSinceRoundStartMillis: 1000,
  killerPuuid: "player-astra",
  victimPuuid: "player-jett",
  damageType: "Weapon",
  damageItem: "Vandal",
  ...overrides,
});

describe("match asset helpers", () => {
  it("normalizes agent names into asset paths", () => {
    expect(getAgentImageSrc("Astra")).toBe("/agents/astra/astra.png");
    expect(getAgentImageSrc("Killjoy")).toBe("/agents/killjoy/killjoy.png");
    expect(getAgentImageSrc("KAY/O")).toBe("/agents/kayo/kayo.png");
    expect(getAgentImageSrc("")).toBe("/agents/astra/astra.png");
  });

  it("normalizes map names into list view icons", () => {
    expect(getMapImageSrc("Ascent")).toBe("/maps/listviewicons/ascent.webp");
    expect(getMapImageSrc("Split")).toBe("/maps/listviewicons/split.webp");
    expect(getMapImageSrc("")).toBe("/maps/listviewicons/ascent.webp");
  });

  it("labels wins and losses", () => {
    expect(getResultLabel("Win")).toBe("Victory");
    expect(getResultLabel("Loss")).toBe("Defeat");
    expect(getResultLabel("Unknown")).toBe("Defeat");
  });
});

describe("match queue filtering", () => {
  const matches = [
    createMatch({ matchId: "competitive", queueLabel: "Competitive" }),
    createMatch({ matchId: "unrated", queueLabel: "Unrated" }),
    createMatch({ matchId: "custom", queueLabel: "Custom" }),
  ];

  it("recognizes supported queue filters", () => {
    expect(isMatchQueueFilter("All")).toBe(true);
    expect(isMatchQueueFilter("Competitive")).toBe(true);
    expect(isMatchQueueFilter("Deathmatch")).toBe(false);
  });

  it("returns all matches for the All filter", () => {
    expect(filterMatchesByQueue(matches, "All")).toBe(matches);
  });

  it("filters matches by their queue label", () => {
    expect(filterMatchesByQueue(matches, "Competitive")).toEqual([
      matches[0],
    ]);
    expect(filterMatchesByQueue(matches, "Custom")).toEqual([matches[2]]);
  });
});

describe("player lookup helpers", () => {
  it("finds players by puuid", () => {
    expect(getPlayerSummary(players, "player-jett")).toEqual(players[1]);
    expect(getPlayerSummary(players, "missing")).toBeUndefined();
    expect(getPlayerSummary(players)).toBeUndefined();
  });

  it("falls back to Astra when the player is unknown", () => {
    expect(getPlayerAgentIconSrc(players, "player-jett")).toBe(
      "/agents/jett/jett.png",
    );
    expect(getPlayerAgentIconSrc(players, "missing")).toBe(
      "/agents/astra/astra.png",
    );
    expect(getPlayerAgentIconSrc(players)).toBe("/agents/astra/astra.png");
  });
});

describe("round outcome helpers", () => {
  it("formats round timestamps as minutes and zero-padded seconds", () => {
    expect(formatTimeSinceRoundStart(0)).toBe("0:00");
    expect(formatTimeSinceRoundStart(65_000)).toBe("1:05");
    expect(formatTimeSinceRoundStart(3_599_999)).toBe("59:59");
  });

  it("rewrites known round result codes", () => {
    expect(getRoundOutcomeText("TimeExpired", "Blue", "Blue")).toBe(
      "Time Expired Win",
    );
    expect(getRoundOutcomeText("Detonate", "Red", "Blue")).toBe(
      "Detonation Loss",
    );
    expect(getRoundOutcomeText("Elimination", "Blue", "Blue")).toBe(
      "Elimination Win",
    );
  });

  it("omits the win/loss suffix without a current team", () => {
    expect(getRoundOutcomeText("Elimination", "Red", undefined)).toBe(
      "Elimination",
    );
  });

  it("prefers the MVP icon for the best round", () => {
    expect(getRoundOutcomeIconSrc("Elimination", "Blue", "Blue", true)).toBe(
      "/matchOutcomes/TX_Icon_MVPStar_Gold.png",
    );
  });

  it("maps result codes and outcomes to outcome icons", () => {
    expect(getRoundOutcomeIconSrc("Elimination", "Blue", "Blue", false)).toBe(
      "/matchOutcomes/eliminationwin1.png",
    );
    expect(getRoundOutcomeIconSrc("Detonate", "Red", "Blue", false)).toBe(
      "/matchOutcomes/explosionloss1.png",
    );
    expect(getRoundOutcomeIconSrc("Defuse", "Blue", "Blue", false)).toBe(
      "/matchOutcomes/diffusewin1.png",
    );
    expect(getRoundOutcomeIconSrc("TimeExpired", "Red", "Blue", false)).toBe(
      "/matchOutcomes/timeloss1.png",
    );
    expect(getRoundOutcomeIconSrc("Surrendered", "Red", "Blue", false)).toBe(
      "/matchOutcomes/EarlySurrender_Flag.png",
    );
  });

  it("defaults the outcome suffix to a win without a current team", () => {
    expect(
      getRoundOutcomeIconSrc("Elimination", "Red", undefined, false),
    ).toBe("/matchOutcomes/eliminationwin1.png");
  });
});

describe("getKillEventImage", () => {
  it("renders spikes for bomb kills", () => {
    expect(
      getKillEventImage(createKillEvent({ damageType: "Bomb" }), players),
    ).toMatchObject({ src: "/tools/spike.webp", alt: "Spike" });
  });

  it("renders a fall death image for fall damage", () => {
    expect(
      getKillEventImage(createKillEvent({ damageType: "Fall" }), players),
    ).toMatchObject({ src: "/weapons/fall_death.png", alt: "Fall damage" });
  });

  it("uses the curated killstream icon for replay ability UUIDs", () => {
    const damageItem = "2F59173C-4BED-B6C3-2191-DEA9B58BE9C7";

    expect(
      getKillEventImage(
        createKillEvent({ damageType: "Ability", damageItem }),
        players,
      ),
    ).toMatchObject({
      src: `/weapons/${damageItem}_killstream.png`,
      alt: "Ability",
    });
  });

  it("resolves live ability slots to the killer's ability icon", () => {
    expect(
      getKillEventImage(
        createKillEvent({ damageType: "Ability", damageItem: "Ultimate" }),
        players,
      ),
    ).toMatchObject({ src: "/agents/astra/cosmic_divide.png", alt: "Ability" });
  });

  it("falls back to the killer's agent icon for unknown abilities", () => {
    expect(
      getKillEventImage(
        createKillEvent({ damageType: "Ability", damageItem: "Passive" }),
        players,
      ),
    ).toMatchObject({ src: "/agents/astra/astra.png", alt: "Ability" });
  });

  it("uses killstream art for weapons and melee", () => {
    expect(getKillEventImage(createKillEvent(), players)).toMatchObject({
      src: "/weapons/VANDAL_killstream.png",
      alt: "Weapon",
    });
    expect(
      getKillEventImage(
        createKillEvent({ damageType: "Melee", damageItem: "knife" }),
        players,
      ),
    ).toMatchObject({
      src: "/weapons/KNIFE_killstream.png",
      alt: "Melee",
    });
  });

  it("falls back to the killer's agent icon when no source is known", () => {
    expect(
      getKillEventImage(
        createKillEvent({ damageType: "", damageItem: undefined }),
        players,
      ),
    ).toMatchObject({ src: "/agents/astra/astra.png", alt: "Kill source" });
  });
});
