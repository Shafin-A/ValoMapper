import { render, screen, within } from "@testing-library/react";
import { MatchPlayerStatsTable } from "@/components/matches/match-player-stats-table";
import { MatchPlayers, MatchRound } from "@/lib/matches";

const players: MatchPlayers = [
  {
    puuid: "blue-1",
    gameName: "BlueOne",
    tagLine: "EUW",
    teamId: "Blue",
    characterId: "astra-id",
    characterName: "Astra",
  },
  {
    puuid: "red-1",
    gameName: "RedOne",
    tagLine: "NA",
    teamId: "Red",
    characterId: "jett-id",
    characterName: "Jett",
  },
];

const createRound = (
  playerStats: MatchRound["playerStats"] = [
    {
      puuid: "blue-1",
      score: 250,
      kills: 3,
      deaths: 1,
      assists: 2,
      economy: { loadoutValue: 3900, remaining: 1200 },
    },
    {
      puuid: "red-1",
      score: 180,
      kills: 1,
      deaths: 2,
      assists: 0,
      economy: { loadoutValue: 2100, remaining: 500 },
    },
  ],
): MatchRound => ({
  roundNumber: 1,
  winningTeam: "Blue",
  roundResultCode: "Elimination",
  scoreAfterRound: { red: 0, blue: 1 },
  playerStats,
  eventLog: [],
});

describe("MatchPlayerStatsTable", () => {
  it("renders score, kills, deaths, assists, and economy for each player", () => {
    render(<MatchPlayerStatsTable players={players} round={createRound()} />);

    const [blueRow, redRow] = screen.getAllByRole("article");

    expect(within(blueRow).getByText("BlueOne")).toBeInTheDocument();
    expect(within(redRow).getByText("RedOne")).toBeInTheDocument();

    ["250", "3", "1", "2", "3900", "1200"].forEach((value) => {
      expect(within(blueRow).getByText(value)).toBeInTheDocument();
    });

    ["180", "1", "2", "0", "2100", "500"].forEach((value) => {
      expect(within(redRow).getByText(value)).toBeInTheDocument();
    });
  });

  it("renders agent artwork", () => {
    const { container } = render(
      <MatchPlayerStatsTable players={players} round={createRound()} />,
    );

    expect(
      container.querySelector('[data-src="/agents/astra/astra.png"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-src="/agents/jett/jett.png"]'),
    ).not.toBeNull();
  });

  it("inserts a gap between blue and red teams", () => {
    const { container } = render(
      <MatchPlayerStatsTable players={players} round={createRound()} />,
    );

    expect(container.querySelectorAll('div[aria-hidden="true"]')).toHaveLength(
      1,
    );
  });

  it("falls back to generic labels for unknown players", () => {
    const { container } = render(
      <MatchPlayerStatsTable
        players={players}
        round={createRound([
          {
            puuid: "unknown",
            score: 0,
            kills: 0,
            deaths: 0,
            assists: 0,
            economy: { loadoutValue: 0, remaining: 0 },
          },
        ])}
        currentPlayerPuuid="unknown"
      />,
    );

    const [row] = screen.getAllByRole("article");

    expect(within(row).getByText("Player")).toBeInTheDocument();
    expect(within(row).getByText("Unknown Agent")).toBeInTheDocument();
    expect(
      within(row).getByRole("img", { name: "Agent" }),
    ).toBeInTheDocument();
    // A single row cannot have a team gap.
    expect(container.querySelectorAll('div[aria-hidden="true"]')).toHaveLength(
      0,
    );
  });

  it("renders only the header when the round has no stats", () => {
    render(<MatchPlayerStatsTable players={players} round={createRound([])} />);

    expect(screen.getByText("Player")).toBeInTheDocument();
    expect(screen.getByText("Econ")).toBeInTheDocument();
    expect(screen.queryByText("BlueOne")).not.toBeInTheDocument();
  });
});
