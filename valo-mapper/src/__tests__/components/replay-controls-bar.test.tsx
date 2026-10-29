import { render, screen } from "@testing-library/react";
import { ReplayControlsBar } from "@/components/replay/replay-controls-bar";
import type { ReplayRound } from "@/lib/replay/types";

const roundWith = (roundNumber: number, winningTeam: string): ReplayRound =>
  ({
    roundNumber,
    winningTeam,
    roundResultCode: "Elimination",
    attackTeamId: "Red",
    scoreAfterRound: { red: 0, blue: 0 },
    playerStats: [],
    eventLog: [],
    frames: [],
    durationMs: 100_000,
  }) as unknown as ReplayRound;

const roundOutcomeIcons = () =>
  screen
    .getAllByTestId("mock-image")
    .filter((icon) => icon.getAttribute("data-src")?.includes("/matchOutcomes/"));

const renderBar = (
  rounds: ReplayRound[],
  currentPlayerTeamId?: string,
) =>
  render(
    <ReplayControlsBar
      rounds={rounds}
      selectedRoundNumber={rounds[0].roundNumber}
      currentPlayerTeamId={currentPlayerTeamId}
      onSelectRound={jest.fn()}
      round={rounds[0]}
      players={[]}
      currentTimeMs={0}
      isPlaying={false}
      speed={1}
      onTogglePlay={jest.fn()}
      onSeek={jest.fn()}
      onSpeedChange={jest.fn()}
      hideDeadAgents={false}
      onHideDeadAgentsChange={jest.fn()}
      showVisionCones
      onShowVisionConesChange={jest.fn()}
    />,
  );

describe("ReplayControlsBar round timeline", () => {
  it("uses Blue as the ally side when there is no viewer", () => {
    renderBar([roundWith(1, "Blue"), roundWith(2, "Red")]);

    const icons = roundOutcomeIcons();
    expect(icons[0]).toHaveAttribute(
      "data-src",
      "/matchOutcomes/eliminationwin1.png",
    );
    expect(icons[1]).toHaveAttribute(
      "data-src",
      "/matchOutcomes/eliminationloss1.png",
    );
  });

  it("uses an explicit ally team when one is supplied", () => {
    renderBar([roundWith(1, "Blue"), roundWith(2, "Red")], "Red");

    const icons = roundOutcomeIcons();
    expect(icons[0]).toHaveAttribute(
      "data-src",
      "/matchOutcomes/eliminationloss1.png",
    );
    expect(icons[1]).toHaveAttribute(
      "data-src",
      "/matchOutcomes/eliminationwin1.png",
    );
  });
});
