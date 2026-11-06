import { render, screen } from "@testing-library/react";
import { MatchRoundSelector } from "@/components/matches/match-round-selector";
import type { MatchRound } from "@/lib/matches";

type SelectorRound = MatchRound & { attackTeamId?: string };

const makeRound = (
  roundNumber: number,
  overrides: Partial<SelectorRound> = {},
): SelectorRound => ({
  roundNumber,
  winningTeam: "Blue",
  roundResultCode: "Elimination",
  scoreAfterRound: { red: 0, blue: 0 },
  playerStats: [],
  eventLog: [],
  ...overrides,
});

const renderSelector = (rounds: SelectorRound[], queueLabel?: string) =>
  render(
    <MatchRoundSelector
      rounds={rounds}
      selectedRoundNumber={1}
      queueLabel={queueLabel}
      onSelectRound={jest.fn()}
    />,
  );

const separators = () => screen.queryAllByTestId("round-half-separator");

describe("MatchRoundSelector half separator", () => {
  it("places the separator after round 4 for Swiftplay", () => {
    renderSelector(
      Array.from({ length: 8 }, (_, index) => makeRound(index + 1)),
      "swiftplay",
    );

    expect(separators()).toHaveLength(1);
    expect(separators()[0]).toHaveAttribute("data-round", "4");
  });

  it("places the separator after round 12 for standard queues", () => {
    renderSelector(
      Array.from({ length: 13 }, (_, index) => makeRound(index + 1)),
      "Competitive",
    );

    expect(separators()).toHaveLength(1);
    expect(separators()[0]).toHaveAttribute("data-round", "12");
  });

  it("uses the observed side switch when replay rounds have no queue label", () => {
    const rounds = [
      ...Array.from({ length: 4 }, (_, index) =>
        makeRound(index + 1, { attackTeamId: "Red" }),
      ),
      ...Array.from({ length: 4 }, (_, index) =>
        makeRound(index + 5, { attackTeamId: "Blue" }),
      ),
    ];

    renderSelector(rounds);

    expect(separators()).toHaveLength(1);
    expect(separators()[0]).toHaveAttribute("data-round", "4");
  });

  it("does not add a separator after the final round", () => {
    renderSelector(
      Array.from({ length: 4 }, (_, index) => makeRound(index + 1)),
      "swiftplay",
    );

    expect(separators()).toHaveLength(0);
  });

  it("keeps an early-ended standard match on the standard half size", () => {
    renderSelector(
      Array.from({ length: 6 }, (_, index) => makeRound(index + 1)),
      "Unrated",
    );

    expect(separators()).toHaveLength(0);
  });
});
