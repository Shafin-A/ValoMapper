import { render, screen } from "@testing-library/react";
import { ReplayScoreboard } from "@/components/replay/replay-scoreboard";
import type {
  ReplayFrame,
  ReplayRound,
  ReplayRoundPlayer,
} from "@/lib/replay/types";
import type { MatchPlayerSummary } from "@/lib/types";

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
    characterName: "Omen",
  },
];

const playerStats: ReplayRoundPlayer[] = [
  {
    puuid: "blue-1",
    score: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    economy: { loadoutValue: 4700, remaining: 900 },
    weaponId: "VANDAL",
    armorId: "822BCAB2-40A2-324E-C137-E09195AD7692",
    incomingDamage: 0,
    abilityCasts: { Grenade: 3000 },
  },
  {
    puuid: "red-1",
    score: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    economy: { loadoutValue: 800, remaining: 0 },
    weaponId: "CLASSIC",
    armorId: "4DEC83D5-4902-9AB3-BED6-A7A390761157",
    incomingDamage: 0,
    abilityCasts: {},
  },
];

const frame: ReplayFrame = {
  timeMs: 4000,
  spike: null,
  players: [
    {
      puuid: "blue-1",
      x: 0,
      y: 0,
      viewRadians: 0,
      hp: 74,
      credits: 1400,
      weaponId: "VANDAL",
      armorId: "822BCAB2-40A2-324E-C137-E09195AD7692",
      alive: true,
    },
    {
      puuid: "red-1",
      x: 0,
      y: 0,
      viewRadians: 0,
      hp: 0,
      credits: 0,
      weaponId: "CLASSIC",
      armorId: "4DEC83D5-4902-9AB3-BED6-A7A390761157",
      alive: false,
    },
  ],
};

const round: ReplayRound = {
  roundNumber: 3,
  winningTeam: "Blue",
  roundResultCode: "Eliminated",
  scoreAfterRound: { red: 1, blue: 2 },
  attackTeamId: "Blue",
  durationMs: 100000,
  eventLog: [],
  playerStats,
  frames: [frame],
};

describe("ReplayScoreboard", () => {
  it("renders the agent name, armor, health and credits", () => {
    render(
      <ReplayScoreboard
        players={players}
        round={round}
        currentTimeMs={4000}
        viewerPuuid="blue-1"
      />,
    );

    expect(screen.queryByText("BlueOne")).not.toBeInTheDocument();
    expect(screen.getByText("Jett")).toBeInTheDocument();
    expect(screen.getByText("Omen")).toBeInTheDocument();
    expect(screen.getAllByText("74").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/100").length).toBeGreaterThan(0);
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("¢1400")).toBeInTheDocument();
    expect(screen.getByText("¢0")).toBeInTheDocument();
  });

  it("renders the ult plus C/Q/E abilities with their remaining charges", () => {
    render(
      <ReplayScoreboard
        players={players}
        round={round}
        currentTimeMs={4000}
        viewerPuuid="blue-1"
      />,
    );

    expect(
      screen.getByTitle("Cloudburst (C) — 1/2 charges"),
    ).toBeInTheDocument();
    expect(screen.getByTitle("Updraft (Q) — 1/1 charges")).toBeInTheDocument();
    expect(screen.getByTitle("Tailwind (E) — 1/1 charges")).toBeInTheDocument();
    expect(
      screen.getByTitle("Blade Storm (X) — available"),
    ).toBeInTheDocument();
  });

  it("renders a dead player after their last frame sample and excludes them from alive", () => {
    const deadRound: ReplayRound = {
      ...round,
      frames: [
        {
          timeMs: 1000,
          spike: null,
          players: [
            { ...frame.players[0] },
            { ...frame.players[1], hp: 100, alive: true },
          ],
        },
        {
          timeMs: 2000,
          spike: null,
          players: [{ ...frame.players[1], hp: 0, alive: false }],
        },
        {
          timeMs: 3000,
          spike: null,
          players: [{ ...frame.players[0], hp: 50 }],
        },
      ],
    };

    const { container } = render(
      <ReplayScoreboard
        players={players}
        round={deadRound}
        currentTimeMs={4000}
        viewerPuuid="blue-1"
      />,
    );

    expect(screen.getByText("1 alive")).toBeInTheDocument();
    expect(screen.getByText("0 alive")).toBeInTheDocument();
    expect(container.querySelectorAll(".opacity-45")).toHaveLength(1);
  });

  it("labels each team block by its team color", () => {
    render(
      <ReplayScoreboard
        players={players}
        round={round}
        currentTimeMs={4000}
        viewerPuuid="blue-1"
      />,
    );

    expect(screen.getByText("Blue Team")).toBeInTheDocument();
    expect(screen.getByText("Red Team")).toBeInTheDocument();
    expect(screen.queryByText("Allies")).not.toBeInTheDocument();
    expect(screen.queryByText("Enemies")).not.toBeInTheDocument();
  });

  it("keeps team labels tied to team color for an enemy-side viewer", () => {
    render(
      <ReplayScoreboard
        players={players}
        round={round}
        currentTimeMs={4000}
        viewerPuuid="red-1"
      />,
    );

    expect(screen.getAllByText(/ Team$/).map((node) => node.textContent)).toEqual(
      ["Red Team", "Blue Team"],
    );
  });

  it("falls back to round stats before the player has a sample", () => {
    render(
      <ReplayScoreboard
        players={players}
        round={{ ...round, frames: [] }}
        currentTimeMs={0}
        viewerPuuid="blue-1"
      />,
    );

    expect(screen.getAllByText("/100").length).toBeGreaterThan(0);
    expect(screen.getByText("¢900")).toBeInTheDocument();
    expect(screen.getByText("¢0")).toBeInTheDocument();
  });
});
