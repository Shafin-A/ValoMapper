import { render, screen } from "@testing-library/react";
import { ReplayCanvasLayer } from "@/components/replay/replay-canvas-layer";
import { getReplayMapPosition } from "@/lib/replay/snapshot";
import { VISION_CONE_MAX_LENGTH } from "@/lib/vision-cone-utils";
import type {
  ReplayFrame,
  ReplayMatch,
  ReplayRound,
} from "@/lib/replay/types";

jest.mock("@/components/canvas-icons", () => ({
  AbilityIcon: ({
    mapPosition,
    showRotationHandle,
    currentLength,
  }: {
    mapPosition?: { x: number; y: number };
    showRotationHandle?: boolean;
    currentLength?: number;
  }) => (
    <span
      data-testid="ability-icon"
      data-map-x={mapPosition?.x}
      data-map-y={mapPosition?.y}
      data-show-rotation-handle={String(showRotationHandle)}
      data-current-length={currentLength}
    />
  ),
  CanvasIcon: () => <span data-testid="canvas-icon" />,
}));

jest.mock("@/contexts/settings-context", () => ({
  useSettings: () => ({ agentsSettings: {}, abilitiesSettings: {} }),
}));

const match = {
  mapId: "pearl",
  players: [],
} as unknown as ReplayMatch;

const round = {
  roundNumber: 1,
  durationMs: 1_000,
  eventLog: [],
  playerStats: [],
  frames: [],
} as unknown as ReplayRound;

const frameWithSpike = (x: number, y: number): ReplayFrame => ({
  timeMs: 0,
  players: [],
  spike: { x, y, state: "planted", site: "A" },
});

describe("ReplayCanvasLayer vision cones", () => {
  it("uses the replay map offset so wall occlusion aligns with the minimap", () => {
    const playerMatch = {
      ...match,
      players: [
        { puuid: "blue-1", teamId: "Blue", characterName: "Jett" },
      ],
    } as unknown as ReplayMatch;
    const frame: ReplayFrame = {
      timeMs: 0,
      spike: null,
      players: [
        {
          puuid: "blue-1",
          x: 1_000,
          y: 1_000,
          viewRadians: 0,
          hp: 100,
          credits: 0,
          alive: true,
        },
      ],
    };

    render(
      <ReplayCanvasLayer
        match={playerMatch}
        round={round}
        frame={frame}
        currentTimeMs={0}
      />,
    );

    const cone = screen.getByTestId("ability-icon");
    expect(cone).toHaveAttribute(
      "data-map-x",
      String(getReplayMapPosition().x),
    );
    expect(cone).toHaveAttribute(
      "data-map-y",
      String(getReplayMapPosition().y),
    );
    expect(cone).toHaveAttribute("data-show-rotation-handle", "false");
    expect(cone).toHaveAttribute(
      "data-current-length",
      String(VISION_CONE_MAX_LENGTH),
    );
  });

  it("paints every vision cone beneath the agent icons", () => {
    const playerMatch = {
      ...match,
      players: [
        { puuid: "blue-1", teamId: "Blue", characterName: "Jett" },
        { puuid: "red-1", teamId: "Red", characterName: "Omen" },
      ],
    } as unknown as ReplayMatch;
    const frame: ReplayFrame = {
      timeMs: 0,
      spike: null,
      players: [
        {
          puuid: "blue-1",
          x: 1_000,
          y: 1_000,
          viewRadians: 0,
          hp: 100,
          credits: 0,
          alive: true,
        },
        {
          puuid: "red-1",
          x: 1_100,
          y: 1_000,
          viewRadians: 0,
          hp: 100,
          credits: 0,
          alive: true,
        },
      ],
    };

    const { container } = render(
      <ReplayCanvasLayer
        match={playerMatch}
        round={round}
        frame={frame}
        currentTimeMs={0}
      />,
    );

    const order = Array.from(
      container.querySelectorAll(
        '[data-testid="ability-icon"], [data-testid="canvas-icon"]',
      ),
    ).map((node) => node.getAttribute("data-testid"));

    expect(order).toEqual([
      "ability-icon",
      "ability-icon",
      "canvas-icon",
      "canvas-icon",
    ]);
  });
});

describe("ReplayCanvasLayer spike", () => {  it("draws a spike that lands on the map", () => {
    render(
      <ReplayCanvasLayer
        match={match}
        round={round}
        frame={frameWithSpike(1_000, 1_000)}
        currentTimeMs={0}
      />,
    );

    expect(screen.getAllByTestId("konva-image")).toHaveLength(1);
  });

  it("hides a spike that lands off the map", () => {
    render(
      <ReplayCanvasLayer
        match={match}
        round={round}
        frame={frameWithSpike(1_000_000_000, 1_000_000_000)}
        currentTimeMs={0}
      />,
    );

    expect(screen.queryByTestId("konva-image")).not.toBeInTheDocument();
  });
});
