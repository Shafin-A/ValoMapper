import { render, screen } from "@testing-library/react";
import { ReplayScoreboard } from "@/components/replay/replay-scoreboard";
import { createReplayClock } from "@/lib/replay/clock";
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
        clock={createReplayClock(4000)}
        viewerPuuid="blue-1"
      />,
    );

    expect(screen.queryByText("BlueOne")).not.toBeInTheDocument();
    expect(screen.getByText("Jett")).toBeInTheDocument();
    expect(screen.getByText("Omen")).toBeInTheDocument();
    expect(screen.getAllByText("74").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/100").length).toBeGreaterThan(0);
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Heavy Shield" })).toHaveAttribute(
      "data-src",
      "/tools/heavy_shield.webp",
    );
    expect(screen.getByRole("img", { name: "Light Shield" })).toHaveAttribute(
      "data-src",
      "/tools/light_shield.webp",
    );
    expect(screen.getByLabelText("1400 credits")).toBeInTheDocument();
    expect(screen.getAllByLabelText("0 credits").length).toBeGreaterThan(0);
  });

  it("uses the server charge timeline instead of cast-count simulation", () => {
    const killjoyPlayers = players.map((player) =>
      player.puuid === "blue-1"
        ? { ...player, characterName: "Killjoy" }
        : player,
    );
    const chargeRound: ReplayRound = {
      ...round,
      buyEndTimeMs: 5000,
      playerStats: playerStats.map((stats) =>
        stats.puuid === "blue-1"
          ? {
              ...stats,
              abilityCasts: {},
              abilityCastTimes: undefined,
              abilityCharges: {
                Ability2: [
                  { timeMs: 0, charges: 1 },
                  { timeMs: 2000, charges: 0 },
                ],
              },
            }
          : stats,
      ),
    };

    const { rerender } = render(
      <ReplayScoreboard
        players={killjoyPlayers}
        round={chargeRound}
        clock={createReplayClock(1500)}
        viewerPuuid="blue-1"
      />,
    );
    expect(
      screen.getByTitle("Turret (E) — 1/1 charges"),
    ).toBeInTheDocument();

    rerender(
      <ReplayScoreboard
        players={killjoyPlayers}
        round={chargeRound}
        clock={createReplayClock(2500)}
        viewerPuuid="blue-1"
      />,
    );
    expect(
      screen.getByTitle("Turret (E) — 0/1 charges"),
    ).toBeInTheDocument();
  });

  it("uses the server ultimate points and cost for the ultimate cell", () => {
    const buildRound = (points: number, active = false): ReplayRound => ({
      ...round,
      playerStats: playerStats.map((stats) =>
        stats.puuid === "blue-1"
          ? {
              ...stats,
              abilityCasts: {},
              abilityCastTimes: undefined,
              ultimatePoints: [{ timeMs: 0, points, active }],
            }
          : stats,
      ),
    });

    const { rerender } = render(
      <ReplayScoreboard
        players={players}
        round={buildRound(3)}
        clock={createReplayClock(4000)}
        viewerPuuid="blue-1"
      />,
    );
    expect(
      screen.getByTitle("Blade Storm (X) — 3/8 points"),
    ).toBeInTheDocument();

    rerender(
      <ReplayScoreboard
        players={players}
        round={buildRound(8)}
        clock={createReplayClock(4000)}
        viewerPuuid="blue-1"
      />,
    );
    expect(
      screen.getByTitle("Blade Storm (X) — 8/8 points · ready"),
    ).toBeInTheDocument();

    rerender(
      <ReplayScoreboard
        players={players}
        round={buildRound(0, true)}
        clock={createReplayClock(4000)}
        viewerPuuid="blue-1"
      />,
    );
    expect(
      screen.getByTitle("Blade Storm (X) — active"),
    ).toBeInTheDocument();
  });

  it("shows the remaining signature cooldown", () => {
    const cooldownRound: ReplayRound = {
      ...round,
      playerStats: playerStats.map((stats) =>
        stats.puuid === "blue-1"
          ? {
              ...stats,
              abilityCasts: {},
              abilityCastTimes: undefined,
              cooldowns: {
                Ability2: [{ startTimeMs: 2000, endTimeMs: 62000 }],
              },
            }
          : stats,
      ),
    };

    const { rerender } = render(
      <ReplayScoreboard
        players={players.map((player) =>
          player.puuid === "blue-1"
            ? { ...player, characterName: "Killjoy" }
            : player,
        )}
        round={cooldownRound}
        clock={createReplayClock(12000)}
        viewerPuuid="blue-1"
      />,
    );
    expect(
      screen.getByTitle("Turret (E) — 1/1 charges · 50s cooldown"),
    ).toBeInTheDocument();
    expect(screen.getByText("50s")).toBeInTheDocument();

    rerender(
      <ReplayScoreboard
        players={players.map((player) =>
          player.puuid === "blue-1"
            ? { ...player, characterName: "Killjoy" }
            : player,
        )}
        round={cooldownRound}
        clock={createReplayClock(62000)}
        viewerPuuid="blue-1"
      />,
    );
    expect(
      screen.getByTitle("Turret (E) — 1/1 charges"),
    ).toBeInTheDocument();
  });

  it("shows a recharge countdown for a single-charge signature", () => {
    const sovaPlayers = players.map((player) =>
      player.puuid === "blue-1"
        ? { ...player, characterName: "Sova" }
        : player,
    );
    const rechargeRound: ReplayRound = {
      ...round,
      playerStats: playerStats.map((stats) =>
        stats.puuid === "blue-1"
          ? {
              ...stats,
              abilityCasts: {},
              abilityCastTimes: undefined,
              abilityCharges: {
                Ability2: [
                  { timeMs: 0, charges: 1 },
                  { timeMs: 2000, charges: 0 },
                  { timeMs: 52000, charges: 1 },
                ],
              },
              cooldowns: {
                Ability2: [
                  { startTimeMs: 2000, endTimeMs: 52000, recharge: true },
                ],
              },
            }
          : stats,
      ),
    };

    render(
      <ReplayScoreboard
        players={sovaPlayers}
        round={rechargeRound}
        clock={createReplayClock(12000)}
        viewerPuuid="blue-1"
      />,
    );

    expect(
      screen.getByTitle("Recon Bolt (E) — 0/1 charges · 40s cooldown"),
    ).toBeInTheDocument();
    expect(screen.getByText("40s")).toBeInTheDocument();
  });

  it("keeps a recharge ability bright while another charge remains", () => {
    const omenPlayers = players.map((player) =>
      player.puuid === "blue-1"
        ? { ...player, characterName: "Omen" }
        : player,
    );
    const rechargeRound: ReplayRound = {
      ...round,
      playerStats: playerStats.map((stats) =>
        stats.puuid === "blue-1"
          ? {
              ...stats,
              abilityCasts: {},
              abilityCastTimes: undefined,
              abilityCharges: {
                Ability2: [
                  { timeMs: 0, charges: 2 },
                  { timeMs: 2000, charges: 1 },
                  { timeMs: 22000, charges: 0 },
                  { timeMs: 42000, charges: 1 },
                ],
              },
              cooldowns: {
                Ability2: [
                  { startTimeMs: 2000, endTimeMs: 42000, recharge: true },
                ],
              },
            }
          : stats,
      ),
    };

    const { rerender } = render(
      <ReplayScoreboard
        players={omenPlayers}
        round={rechargeRound}
        clock={createReplayClock(12000)}
        viewerPuuid="blue-1"
      />,
    );
    expect(
      screen.getByTitle("Dark Cover (E) — 1/2 charges · 30s cooldown"),
    ).toBeInTheDocument();
    expect(screen.queryByText("30s")).not.toBeInTheDocument();

    rerender(
      <ReplayScoreboard
        players={omenPlayers}
        round={rechargeRound}
        clock={createReplayClock(22000)}
        viewerPuuid="blue-1"
      />,
    );
    expect(
      screen.getByTitle("Dark Cover (E) — 0/2 charges · 20s cooldown"),
    ).toBeInTheDocument();
    expect(screen.getByText("20s")).toBeInTheDocument();
  });

  it("marks buy-phase utility placements as used abilities", () => {
    render(
      <ReplayScoreboard
        players={players.map((player) =>
          player.puuid === "blue-1"
            ? { ...player, characterName: "Killjoy" }
            : player,
        )}
        round={{
          ...round,
          buyEndTimeMs: 5000,
          utilities: [
            {
              id: "turret-1",
              kind: "trap",
              abilityId: "turret",
              startTimeMs: 2000,
              endTimeMs: 50000,
              position: { x: 1000, y: 1000 },
              ownerPuuid: "blue-1",
            },
          ],
          playerStats: playerStats.map((stats) =>
            stats.puuid === "blue-1"
              ? { ...stats, abilityCasts: {}, abilityCastTimes: undefined }
              : stats,
          ),
        }}
        clock={createReplayClock(6000)}
        viewerPuuid="blue-1"
      />,
    );

    expect(
      screen.getByTitle("Turret (E) — 0/1 charges"),
    ).toBeInTheDocument();
  });

  it("tracks every cast time when counting remaining charges", () => {
    render(
      <ReplayScoreboard
        players={players}
        round={{
          ...round,
          playerStats: playerStats.map((stats) =>
            stats.puuid === "blue-1"
              ? {
                  ...stats,
                  abilityCasts: { Grenade: 1000 },
                  abilityCastTimes: { Grenade: [1000, 3000] },
                }
              : stats,
          ),
        }}
        clock={createReplayClock(4000)}
        viewerPuuid="blue-1"
      />,
    );

    expect(
      screen.getByTitle("Cloudburst (C) — 0/2 charges"),
    ).toBeInTheDocument();
  });

  it("keeps charges available before their cast time", () => {
    render(
      <ReplayScoreboard
        players={players}
        round={{
          ...round,
          playerStats: playerStats.map((stats) =>
            stats.puuid === "blue-1"
              ? {
                  ...stats,
                  abilityCasts: { Grenade: 3000 },
                  abilityCastTimes: { Grenade: [3000] },
                }
              : stats,
          ),
        }}
        clock={createReplayClock(2000)}
        viewerPuuid="blue-1"
      />,
    );

    expect(
      screen.getByTitle("Cloudburst (C) — 2/2 charges"),
    ).toBeInTheDocument();
  });

  it("renders the ult plus C/Q/E abilities with their remaining charges", () => {
    render(
      <ReplayScoreboard
        players={players}
        round={round}
        clock={createReplayClock(4000)}
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
        clock={createReplayClock(4000)}
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
        clock={createReplayClock(4000)}
        viewerPuuid="blue-1"
      />,
    );

    expect(screen.getByText("Blue Team")).toBeInTheDocument();
    expect(screen.getByText("Red Team")).toBeInTheDocument();
    expect(screen.queryByText("Allies")).not.toBeInTheDocument();
    expect(screen.queryByText("Enemies")).not.toBeInTheDocument();
  });

  it("colors each agent image border to match their team", () => {
    render(
      <ReplayScoreboard
        players={players}
        round={round}
        clock={createReplayClock(4000)}
        viewerPuuid="blue-1"
      />,
    );

    expect(screen.getByRole("img", { name: "Jett" }).parentElement).toHaveClass(
      "border-[#42EEC7]",
    );
    expect(screen.getByRole("img", { name: "Omen" }).parentElement).toHaveClass(
      "border-[#FF4655]",
    );
  });

  it("keeps team labels tied to team color for an enemy-side viewer", () => {
    render(
      <ReplayScoreboard
        players={players}
        round={round}
        clock={createReplayClock(4000)}
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
        clock={createReplayClock(0)}
        viewerPuuid="blue-1"
      />,
    );

    expect(screen.getAllByText("/100").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("900 credits")).toBeInTheDocument();
    expect(screen.getAllByLabelText("0 credits").length).toBeGreaterThan(0);
  });
});
