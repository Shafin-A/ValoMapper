import { render, screen } from "@testing-library/react";
import { ReplayControlsBar } from "@/components/replay/replay-controls-bar";
import type { ReplayRound } from "@/lib/replay/types";

const mockSelectContentRender = jest.fn();

jest.mock("@/components/ui/select", () => {
  const React = jest.requireActual("react") as typeof import("react");
  const passthrough = (name: string) => {
    const Component = ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { "data-mock": name }, children);
    Component.displayName = name;
    return Component;
  };

  return {
    Select: passthrough("Select"),
    SelectContent: ({ children }: { children?: React.ReactNode }) => {
      mockSelectContentRender();
      return React.createElement("div", null, children);
    },
    SelectItem: passthrough("SelectItem"),
    SelectTrigger: passthrough("SelectTrigger"),
    SelectValue: passthrough("SelectValue"),
  };
});

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

const handlers = {
  onSelectRound: jest.fn(),
  onTogglePlay: jest.fn(),
  onSeek: jest.fn(),
  onSpeedChange: jest.fn(),
  onHideDeadAgentsChange: jest.fn(),
  onHideAgentWeaponsChange: jest.fn(),
  onHideWeaponHitsChange: jest.fn(),
  onShowVisionConesChange: jest.fn(),
  onShowUtilitiesChange: jest.fn(),
  onStartAtBarrierDropChange: jest.fn(),
};

const barElement = (
  rounds: ReplayRound[],
  currentPlayerTeamId?: string,
  currentTimeMs = 0,
) => (
  <ReplayControlsBar
    rounds={rounds}
    selectedRoundNumber={rounds[0].roundNumber}
    currentPlayerTeamId={currentPlayerTeamId}
    onSelectRound={handlers.onSelectRound}
    round={rounds[0]}
    players={[]}
    currentTimeMs={currentTimeMs}
    isPlaying={false}
    speed={1}
    onTogglePlay={handlers.onTogglePlay}
    onSeek={handlers.onSeek}
    onSpeedChange={handlers.onSpeedChange}
    hideDeadAgents={false}
    onHideDeadAgentsChange={handlers.onHideDeadAgentsChange}
    hideAgentWeapons={false}
    onHideAgentWeaponsChange={handlers.onHideAgentWeaponsChange}
    hideWeaponHits={false}
    onHideWeaponHitsChange={handlers.onHideWeaponHitsChange}
    showVisionCones
    onShowVisionConesChange={handlers.onShowVisionConesChange}
    showUtilities
    onShowUtilitiesChange={handlers.onShowUtilitiesChange}
    startAtBarrierDrop
    onStartAtBarrierDropChange={handlers.onStartAtBarrierDropChange}
  />
);

const renderBar = (rounds: ReplayRound[], currentPlayerTeamId?: string) =>
  render(barElement(rounds, currentPlayerTeamId));

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

describe("ReplayControlsBar speed select", () => {
  it("does not re-render the speed select as playback advances", () => {
    const rounds = [roundWith(1, "Blue")];
    const { rerender } = render(barElement(rounds));
    mockSelectContentRender.mockClear();

    rerender(barElement(rounds, undefined, 500));

    expect(mockSelectContentRender).not.toHaveBeenCalled();
  });
});
