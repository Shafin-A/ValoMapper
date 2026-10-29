import { render, screen } from "@testing-library/react";
import { ReplayCanvasLayer } from "@/components/replay/replay-canvas-layer";
import {
  TOOL_ICON_CONTOUR_COLOR,
  TOOL_ICON_CONTOUR_WIDTH,
} from "@/lib/consts";
import { getToolIconAttachmentPosition } from "@/lib/tool-icon";
import {
  getReplayMapPosition,
  toReplayCanvasPoint,
} from "@/lib/replay/snapshot";
import { VISION_CONE_MAX_LENGTH } from "@/lib/vision-cone-utils";
import type {
  ReplayFrame,
  ReplayMatch,
  ReplayRound,
} from "@/lib/replay/types";
import type { ToolIconCanvas } from "@/lib/types";

const mockIconSettings = {
  scale: 40,
  borderOpacity: 0,
  borderWidth: 0,
  radius: 0,
  allyColor: "#ffffff",
  enemyColor: "#ffffff",
};

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
  CanvasIcon: ({
    id,
    isGray,
    x,
    y,
    contourColor,
    contourWidth,
  }: {
    id?: string;
    isGray?: boolean;
    x?: number;
    y?: number;
    contourColor?: string;
    contourWidth?: number;
  }) => (
    <span
      data-testid="canvas-icon"
      data-id={id}
      data-gray={String(isGray)}
      data-x={x}
      data-y={y}
      data-contour-color={contourColor}
      data-contour-width={contourWidth}
    />
  ),
}));

jest.mock("@/contexts/settings-context", () => ({
  useSettings: () => ({
    agentsSettings: mockIconSettings,
    abilitiesSettings: mockIconSettings,
  }),
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

  it("keeps a dead player on the map when the current frame omits them", () => {
    const playerMatch = {
      ...match,
      players: [
        { puuid: "blue-1", teamId: "Blue", characterName: "Jett" },
      ],
    } as unknown as ReplayMatch;
    const deathFrame: ReplayFrame = {
      timeMs: 0,
      spike: null,
      players: [
        {
          puuid: "blue-1",
          x: 1_000,
          y: 1_000,
          viewRadians: 0,
          hp: 0,
          credits: 0,
          alive: false,
        },
      ],
    };

    render(
      <ReplayCanvasLayer
        match={playerMatch}
        round={{ ...round, frames: [deathFrame] }}
        frame={{ timeMs: 500, spike: null, players: [] }}
        currentTimeMs={500}
      />,
    );

    expect(screen.getByTestId("canvas-icon")).toHaveAttribute(
      "data-gray",
      "true",
    );
    expect(screen.queryByTestId("ability-icon")).not.toBeInTheDocument();
  });

  it("can hide vision cones while keeping agent icons", () => {
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
        showVisionCones={false}
      />,
    );

    expect(screen.queryByTestId("ability-icon")).not.toBeInTheDocument();
    expect(screen.getByTestId("canvas-icon")).toBeInTheDocument();
  });

  it("hides dead players when requested", () => {
    const playerMatch = {
      ...match,
      players: [
        { puuid: "blue-1", teamId: "Blue", characterName: "Jett" },
      ],
    } as unknown as ReplayMatch;
    const deathFrame: ReplayFrame = {
      timeMs: 0,
      spike: null,
      players: [
        {
          puuid: "blue-1",
          x: 1_000,
          y: 1_000,
          viewRadians: 0,
          hp: 0,
          credits: 0,
          alive: false,
        },
      ],
    };

    render(
      <ReplayCanvasLayer
        match={playerMatch}
        round={{ ...round, frames: [deathFrame] }}
        frame={{ timeMs: 500, spike: null, players: [] }}
        currentTimeMs={500}
        hideDeadAgents
      />,
    );

    expect(screen.queryByTestId("canvas-icon")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ability-icon")).not.toBeInTheDocument();
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

describe("ReplayCanvasLayer spike", () => {
  it("draws a spike that lands on the map", () => {
    render(
      <ReplayCanvasLayer
        match={match}
        round={round}
        frame={frameWithSpike(1_000, 1_000)}
        currentTimeMs={0}
      />,
    );

    expect(screen.getAllByTestId("canvas-icon")).toHaveLength(1);
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

    expect(screen.queryByTestId("canvas-icon")).not.toBeInTheDocument();
  });

  it("attaches a carried spike to the carrying agent", () => {
    const playerMatch = {
      ...match,
      players: [
        { puuid: "blue-1", teamId: "Blue", characterName: "Jett" },
      ],
    } as unknown as ReplayMatch;
    const frame: ReplayFrame = {
      timeMs: 0,
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
      spike: { x: 500, y: 500, state: "carried", carrierPuuid: "blue-1" },
    };

    render(
      <ReplayCanvasLayer
        match={playerMatch}
        round={round}
        frame={frame}
        currentTimeMs={0}
      />,
    );

    const agentPoint = toReplayCanvasPoint({
      mapId: "pearl",
      mapSide: "defense",
      position: { x: 1_000, y: 1_000 },
    });
    const spikeIcon: ToolIconCanvas = {
      id: "replay-spike",
      x: 0,
      y: 0,
      name: "spike",
      width: 32,
      height: 32,
    };
    const expected = getToolIconAttachmentPosition(
      spikeIcon,
      agentPoint!.x,
      agentPoint!.y,
      mockIconSettings,
    );

    const image = screen
      .getAllByTestId("canvas-icon")
      .find((node) => node.getAttribute("data-id") === "replay-spike");
    expect(image).toBeDefined();
    expect(Number(image!.getAttribute("data-x"))).toBeCloseTo(expected.x);
    expect(Number(image!.getAttribute("data-y"))).toBeCloseTo(expected.y);
  });

  it("leaves a planted spike at its recorded position", () => {
    render(
      <ReplayCanvasLayer
        match={match}
        round={round}
        frame={frameWithSpike(1_000, 1_000)}
        currentTimeMs={0}
      />,
    );

    const point = toReplayCanvasPoint({
      mapId: "pearl",
      mapSide: "defense",
      position: { x: 1_000, y: 1_000 },
    });
    const image = screen.getByTestId("canvas-icon");
    expect(Number(image.getAttribute("data-x"))).toBeCloseTo(point!.x);
    expect(Number(image.getAttribute("data-y"))).toBeCloseTo(point!.y);
    expect(image).toHaveAttribute(
      "data-contour-color",
      TOOL_ICON_CONTOUR_COLOR,
    );
    expect(image).toHaveAttribute(
      "data-contour-width",
      String(TOOL_ICON_CONTOUR_WIDTH),
    );
  });
});
