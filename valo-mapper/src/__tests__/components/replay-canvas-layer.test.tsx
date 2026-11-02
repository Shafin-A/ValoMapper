import { render, screen } from "@testing-library/react";
import { ReplayCanvasLayer } from "@/components/replay/replay-canvas-layer";
import {
  TOOL_ICON_CONTOUR_COLOR,
  TOOL_ICON_CONTOUR_WIDTH,
} from "@/lib/consts";
import { getReplayWeaponIcon } from "@/lib/replay/display";
import { getToolIconAttachmentPosition } from "@/lib/tool-icon";
import { mToPixels } from "@/lib/utils";
import {
  getReplayMapPosition,
  toReplayCanvasPoint,
  toReplayCanvasRotation,
} from "@/lib/replay/snapshot";
import { VISION_CONE_MAX_LENGTH } from "@/lib/vision-cone-utils";
import type {
  ReplayFrame,
  ReplayMatch,
  ReplayRound,
  ReplayUtility,
} from "@/lib/replay/types";
import type { ToolIconCanvas } from "@/lib/types";
import type { ReactNode } from "react";

const mockIconSettings = {
  scale: 40,
  borderOpacity: 0,
  borderWidth: 0,
  radius: 0,
  allyColor: "#ffffff",
  enemyColor: "#ffffff",
};

const CLASSIC_WEAPON_ID = "29A0CFAB-485B-F5D5-779A-B59F85E204A8";
const KNIFE_WEAPON_ID = "2F59173C-4BED-B6C3-2191-DEA9B58BE9C7";

jest.mock("react-konva", () => {
  const React = jest.requireActual("react") as typeof import("react");
  return {
    Circle: ({ x, y, fill }: { x: number; y: number; fill: string }) =>
      React.createElement("span", {
        "data-testid": "utility-marker",
        "data-x": x,
        "data-y": y,
        "data-fill": fill,
      }),
    Image: ({
      image,
      x,
      y,
    }: {
      image?: { src?: string };
      x: number;
      y: number;
    }) =>
      React.createElement("span", {
        "data-testid": "utility-ability-image",
        "data-src": image?.src,
        "data-x": x,
        "data-y": y,
      }),
    Group: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    Line: ({
      id,
      points,
      stroke,
    }: {
      id?: string;
      points: number[];
      stroke: string;
    }) =>
      React.createElement("span", {
      "data-testid": "konva-line",
        id,
        points: points.join(","),
        "data-stroke": stroke,
      }),
  };
});

jest.mock("@/components/canvas-icons", () => ({
  AbilityIcon: ({
    id,
    action,
    x,
    y,
    src,
    width,
    height,
    isAlly,
    mapPosition,
    showRotationHandle,
    rotation,
    currentLength,
    currentPath,
    showHandle,
    iconOnly,
  }: {
    id?: string;
    action?: string;
    x?: number;
    y?: number;
    src?: string;
    width?: number;
    height?: number;
    isAlly?: boolean;
    mapPosition?: { x: number; y: number };
    showRotationHandle?: boolean;
    rotation?: number;
    currentLength?: number;
    currentPath?: { x: number; y: number }[];
    showHandle?: boolean;
    iconOnly?: boolean;
  }) => (
    <span
      data-testid="ability-icon"
      data-id={id}
      data-action={action}
      data-x={x}
      data-y={y}
      data-src={src}
      data-width={width}
      data-height={height}
      data-is-ally={String(isAlly)}
      data-map-x={mapPosition?.x}
      data-map-y={mapPosition?.y}
      data-show-rotation-handle={String(showRotationHandle)}
      data-rotation={rotation}
      data-current-length={currentLength}
      data-current-path={JSON.stringify(currentPath ?? [])}
      data-show-handle={String(showHandle)}
      data-icon-only={String(iconOnly)}
    />
  ),
  CanvasIcon: ({
    id,
    isGray,
    x,
    y,
    src,
    width,
    height,
    contourColor,
    contourWidth,
  }: {
    id?: string;
    isGray?: boolean;
    x?: number;
    y?: number;
    src?: string;
    width?: number;
    height?: number;
    contourColor?: string;
    contourWidth?: number;
  }) => (
    <span
      data-testid="canvas-icon"
      data-id={id}
      data-gray={String(isGray)}
      data-x={x}
      data-y={y}
      data-src={src}
      data-width={width}
      data-height={height}
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

describe("ReplayCanvasLayer utilities", () => {
  const lotusMatch = { ...match, mapId: "lotus" } as ReplayMatch;
  const lotusSpawn = { x: 6431.3, y: -5267.8 };
  const frame: ReplayFrame = { timeMs: 0, players: [], spike: null };
  const utilityRound = (utilities: ReplayUtility[]): ReplayRound =>
    ({ ...round, utilities }) as ReplayRound;

  it.each([
    ["aftershock", 0, undefined, 90, 0],
    ["fault_line", 8, mToPixels(56), 90, 0],
    ["fast_lane", 0, undefined, 90, 0],
    ["bassquake", 0, undefined, 0, 0],
    ["barrier_orb", 0, undefined, 90, 90],
    ["shear", 0, undefined, 90, 90],
  ] as const)(
    "orients %s from actor yaw with its configured geometry",
    (abilityId, anchorGapMeters, currentLength, yaw, yawOffset) => {
      const utility: ReplayUtility = {
        id: `utility-${abilityId}`,
        kind: "area",
        abilityId,
        yaw,
        startTimeMs: 0,
        endTimeMs: 500,
        position: lotusSpawn,
      };
      render(
        <ReplayCanvasLayer
          match={lotusMatch}
          round={utilityRound([utility])}
          frame={frame}
          currentTimeMs={100}
        />,
      );

      const icon = screen.getByTestId("ability-icon");
      const point = toReplayCanvasPoint({
        mapId: lotusMatch.mapId,
        mapSide: "defense",
        position: lotusSpawn,
      })!;
      const rotation = toReplayCanvasRotation({
        mapId: lotusMatch.mapId,
        mapSide: "defense",
        location: lotusSpawn,
        viewRadians: (yaw * Math.PI) / 180,
      });
      const gap = mToPixels(anchorGapMeters);
      expect(Number(icon.getAttribute("data-rotation"))).toBeCloseTo(
        rotation + yawOffset,
      );
      expect(Number(icon.getAttribute("data-x"))).toBeCloseTo(
        point.x - Math.cos((rotation * Math.PI) / 180) * gap,
      );
      expect(Number(icon.getAttribute("data-y"))).toBeCloseTo(
        point.y - Math.sin((rotation * Math.PI) / 180) * gap,
      );
      if (currentLength === undefined) {
        expect(icon).not.toHaveAttribute("data-current-length");
      } else {
        expect(Number(icon.getAttribute("data-current-length"))).toBeCloseTo(
          currentLength,
        );
      }
    },
  );

  it("uses the measured Trapwire endpoint distance for its rendered line", () => {
    const trapwire: ReplayUtility = {
      id: "utility-trapwire",
      kind: "wall",
      abilityId: "trapwire",
      startTimeMs: 0,
      endTimeMs: 500,
      position: lotusSpawn,
      yaw: 90,
      length: 6,
    };

    render(
      <ReplayCanvasLayer
        match={lotusMatch}
        round={utilityRound([trapwire])}
        frame={frame}
        currentTimeMs={100}
      />,
    );

    expect(
      Number(screen.getByTestId("ability-icon").getAttribute("data-current-length")),
    ).toBeCloseTo(mToPixels(8));
  });

  it("renders a placed Cyber Cage as an icon without its activation circle", () => {
    const placedCage: ReplayUtility = {
      id: "utility-cyber-cage-placed",
      kind: "marker",
      abilityId: "cyber_cage",
      startTimeMs: 0,
      endTimeMs: 500,
      position: lotusSpawn,
      iconOnly: true,
    };

    render(
      <ReplayCanvasLayer
        match={lotusMatch}
        round={utilityRound([placedCage])}
        frame={frame}
        currentTimeMs={100}
      />,
    );

    expect(screen.getByTestId("ability-icon")).toHaveAttribute(
      "data-action",
      "cypher_cage",
    );
    expect(screen.getByTestId("ability-icon")).toHaveAttribute(
      "data-icon-only",
      "true",
    );
  });

  it("shows Spycam's vision cone only while the camera is possessed", () => {
    const spycam: ReplayUtility = {
      id: "utility-spycam",
      kind: "marker",
      abilityId: "spycam",
      startTimeMs: 0,
      endTimeMs: 600,
      position: lotusSpawn,
      vision: [
        { timeMs: 100, yaw: 90, active: true },
        { timeMs: 500, yaw: 180, active: false },
      ],
    };

    const { rerender } = render(
      <ReplayCanvasLayer
        match={lotusMatch}
        round={utilityRound([spycam])}
        frame={frame}
        currentTimeMs={300}
      />,
    );
    expect(
      screen.getAllByTestId("ability-icon").some(
        (icon) => icon.getAttribute("data-action") === "vision_cone_103",
      ),
    ).toBe(true);

    rerender(
      <ReplayCanvasLayer
        match={lotusMatch}
        round={utilityRound([spycam])}
        frame={frame}
        currentTimeMs={500}
      />,
    );
    expect(
      screen.getAllByTestId("ability-icon").some(
        (icon) => icon.getAttribute("data-action") === "vision_cone_103",
      ),
    ).toBe(false);
  });

  it("shows Nanoswarm as an icon with its throw trajectory", () => {
    const nanoswarm: ReplayUtility = {
      id: "utility-nanoswarm-flight",
      kind: "mobile",
      abilityId: "nanoswarm",
      startTimeMs: 0,
      endTimeMs: 500,
      position: lotusSpawn,
      iconOnly: true,
      samples: [
        { timeMs: 0, ...lotusSpawn },
        { timeMs: 100, x: 6505.5, y: 4043 },
      ],
    };

    render(
      <ReplayCanvasLayer
        match={lotusMatch}
        round={utilityRound([nanoswarm])}
        frame={frame}
        currentTimeMs={100}
      />,
    );

    expect(screen.getByTestId("ability-icon")).toHaveAttribute(
      "data-action",
      "kj_molly",
    );
    expect(screen.getByTestId("ability-icon")).toHaveAttribute(
      "data-icon-only",
      "true",
    );
    expect(
      screen.getAllByTestId("konva-line").some(
        (line) => line.getAttribute("data-stroke") === "#4ade80",
      ),
    ).toBe(true);
  });

  it("renders stationary utility markers only during their round-relative lifetime", () => {
    const smoke: ReplayUtility = {
      id: "utility-0001",
      kind: "smoke",
      abilityId: "cloudburst",
      startTimeMs: 100,
      endTimeMs: 500,
      position: lotusSpawn,
    };

    const { rerender } = render(
      <ReplayCanvasLayer
        match={lotusMatch}
        round={utilityRound([smoke])}
        frame={frame}
        currentTimeMs={99}
      />,
    );
    expect(screen.queryByTestId("utility-marker")).not.toBeInTheDocument();

    rerender(
      <ReplayCanvasLayer
        match={lotusMatch}
        round={utilityRound([smoke])}
        frame={frame}
        currentTimeMs={100}
      />,
    );
    const abilityIcon = screen.getByTestId("ability-icon");
    expect(abilityIcon).toHaveAttribute("data-id", "utility-0001");
    expect(abilityIcon).toHaveAttribute("data-action", "jett_smoke");
    expect(abilityIcon).toHaveAttribute(
      "data-src",
      "/agents/jett/cloudburst.png",
    );
    expect(abilityIcon).toHaveAttribute("data-width", "40");
    expect(abilityIcon).toHaveAttribute("data-height", "40");
    expect(abilityIcon).toHaveAttribute("data-is-ally", "false");

    rerender(
      <ReplayCanvasLayer
        match={lotusMatch}
        round={utilityRound([smoke])}
        frame={frame}
        currentTimeMs={500}
      />,
    );
    expect(screen.queryByTestId("utility-marker")).not.toBeInTheDocument();
  });

  it.each([
    ["Blue", "#42EEC7"],
    ["Red", "#FF4655"],
  ] as const)(
    "colors the mobile marker and path for the %s team and follows playback seeks",
    (teamId, teamColor) => {
    const mobile: ReplayUtility = {
      id: "utility-0002",
      kind: "mobile",
      ownerPuuid: "owner-1",
      startTimeMs: 0,
      endTimeMs: 500,
      position: lotusSpawn,
      samples: [
        { timeMs: 0, ...lotusSpawn },
        { timeMs: 100, x: 6505.5, y: 4043 },
      ],
    };

    const { rerender } = render(
      <ReplayCanvasLayer
        match={
          {
            ...lotusMatch,
            players: [{ puuid: "owner-1", teamId }],
          } as ReplayMatch
        }
        round={utilityRound([mobile])}
        frame={frame}
        currentTimeMs={100}
      />,
    );
    expect(screen.getByTestId("utility-marker")).toHaveAttribute(
      "data-fill",
      teamColor,
    );
    expect(
      screen.queryAllByTestId("konva-line").some(
        (line) => line.getAttribute("data-stroke") === teamColor,
      ),
    ).toBe(true);

    rerender(
      <ReplayCanvasLayer
        match={
          {
            ...lotusMatch,
            players: [{ puuid: "owner-1", teamId }],
          } as ReplayMatch
        }
        round={utilityRound([mobile])}
        frame={frame}
        currentTimeMs={400}
      />,
    );
    expect(screen.queryByTestId("utility-marker")).not.toBeInTheDocument();
    },
  );

  it("renders the Sova Shock Bolt icon and playback-time projectile trail", () => {
    const shockBolt: ReplayUtility = {
      id: "utility-shock-bolt",
      kind: "mobile",
      abilityId: "shock_bolt",
      ownerPuuid: "owner-1",
      startTimeMs: 0,
      endTimeMs: 200,
      position: lotusSpawn,
      samples: [
        { timeMs: 50, ...lotusSpawn },
        { timeMs: 100, x: 6505.5, y: 4043 },
      ],
    };

    const { rerender } = render(
      <ReplayCanvasLayer
        match={
          {
            ...lotusMatch,
            players: [{ puuid: "owner-1", teamId: "Blue" }],
          } as ReplayMatch
        }
        round={utilityRound([shockBolt])}
        frame={frame}
        currentTimeMs={50}
      />,
    );
    expect(screen.getByTestId("ability-icon")).toHaveAttribute(
      "data-src",
      "/agents/sova/shock_bolt.png",
    );
    expect(
      screen.queryAllByTestId("konva-line").some(
        (line) =>
          line.getAttribute("data-stroke") === "#42EEC7" &&
          line.getAttribute("points")?.split(",").length === 4,
      ),
    ).toBe(false);

    rerender(
      <ReplayCanvasLayer
        match={
          {
            ...lotusMatch,
            players: [{ puuid: "owner-1", teamId: "Blue" }],
          } as ReplayMatch
        }
        round={utilityRound([shockBolt])}
        frame={frame}
        currentTimeMs={100}
      />,
    );
    expect(
      screen.getAllByTestId("konva-line").some(
        (line) =>
          line.getAttribute("data-stroke") === "#42EEC7" &&
          line.getAttribute("points")?.split(",").length === 4,
      ),
    ).toBe(true);

    rerender(
      <ReplayCanvasLayer
        match={
          {
            ...lotusMatch,
            players: [{ puuid: "owner-1", teamId: "Blue" }],
          } as ReplayMatch
        }
        round={utilityRound([shockBolt])}
        frame={frame}
        currentTimeMs={200}
      />,
    );
    expect(screen.queryByTestId("ability-icon")).not.toBeInTheDocument();
  });

  it("draws only observed Blaze wall points using the ability icon path", () => {
    const blaze: ReplayUtility = {
      id: "utility-blaze",
      kind: "wall",
      abilityId: "blaze",
      startTimeMs: 0,
      endTimeMs: 500,
      position: lotusSpawn,
      path: [
        { timeMs: 0, ...lotusSpawn },
        { timeMs: 100, x: 6505.5, y: -5267.8 },
        { timeMs: 200, x: 6505.5, y: -5200 },
      ],
    };

    const { rerender } = render(
      <ReplayCanvasLayer
        match={lotusMatch}
        round={utilityRound([blaze])}
        frame={frame}
        currentTimeMs={50}
      />,
    );

    let abilityIcon = screen.getByTestId("ability-icon");
    expect(abilityIcon).toHaveAttribute("data-action", "phoenix_wall");
    expect(
      JSON.parse(abilityIcon.getAttribute("data-current-path")!),
    ).toHaveLength(1);

    rerender(
      <ReplayCanvasLayer
        match={lotusMatch}
        round={utilityRound([blaze])}
        frame={frame}
        currentTimeMs={100}
      />,
    );

    abilityIcon = screen.getByTestId("ability-icon");
    expect(abilityIcon).toHaveAttribute("data-show-handle", "false");
    const originPoint = toReplayCanvasPoint({
      mapId: "lotus",
      mapSide: "defense",
      position: lotusSpawn,
    })!;
    const secondPoint = toReplayCanvasPoint({
      mapId: "lotus",
      mapSide: "defense",
      position: { x: 6505.5, y: -5267.8 },
    })!;
    const currentPath = JSON.parse(
      abilityIcon.getAttribute("data-current-path")!,
    ) as { x: number; y: number }[];
    expect(currentPath).toHaveLength(2);
    expect(currentPath[0]).toEqual({ x: 0, y: 0 });
    expect(currentPath[1].x).toBeCloseTo(secondPoint.x - originPoint.x);
    expect(currentPath[1].y).toBeCloseTo(secondPoint.y - originPoint.y);
    expect(Number(abilityIcon.getAttribute("data-x"))).toBeCloseTo(
      originPoint.x,
    );
    expect(Number(abilityIcon.getAttribute("data-y"))).toBeCloseTo(
      originPoint.y,
    );
  });

  it("hides off-map utility and honors the visibility toggle", () => {
    const smoke: ReplayUtility = {
      id: "utility-0003",
      kind: "smoke",
      startTimeMs: 0,
      endTimeMs: 500,
      position: { x: 1_000_000_000, y: 1_000_000_000 },
    };
    const { rerender } = render(
      <ReplayCanvasLayer
        match={lotusMatch}
        round={utilityRound([smoke])}
        frame={frame}
        currentTimeMs={100}
      />,
    );
    expect(screen.queryByTestId("utility-marker")).not.toBeInTheDocument();

    rerender(
      <ReplayCanvasLayer
        match={lotusMatch}
        round={utilityRound([{ ...smoke, position: lotusSpawn }])}
        frame={frame}
        currentTimeMs={100}
        showUtilities={false}
      />,
    );
    expect(screen.queryByTestId("utility-marker")).not.toBeInTheDocument();
  });
});

describe("ReplayCanvasLayer agent weapons", () => {
  const playerMatch = {
    ...match,
    players: [{ puuid: "blue-1", teamId: "Blue", characterName: "Jett" }],
  } as unknown as ReplayMatch;

  const frameWithWeapon = (weaponId?: string): ReplayFrame => ({
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
        weaponId,
        alive: true,
      },
    ],
  });

  it("attaches the equipped weapon to the agent", () => {
    render(
      <ReplayCanvasLayer
        match={playerMatch}
        round={round}
        frame={frameWithWeapon(CLASSIC_WEAPON_ID)}
        currentTimeMs={0}
      />,
    );

    const weapon = getReplayWeaponIcon(CLASSIC_WEAPON_ID)!;
    const agentPoint = toReplayCanvasPoint({
      mapId: "pearl",
      mapSide: "defense",
      position: { x: 1_000, y: 1_000 },
    })!;
    const expected = getToolIconAttachmentPosition(
      {
        id: "replay-weapon-0",
        x: agentPoint.x,
        y: agentPoint.y,
        ...weapon,
      },
      agentPoint.x,
      agentPoint.y,
      mockIconSettings,
    );

    const icon = screen
      .getAllByTestId("canvas-icon")
      .find((node) => node.getAttribute("data-id") === "replay-weapon-0");
    expect(icon).toBeDefined();
    expect(icon).toHaveAttribute("data-src", "/tools/classic.webp");
    expect(icon).toHaveAttribute("data-width", String(weapon.width));
    expect(Number(icon!.getAttribute("data-x"))).toBeCloseTo(expected.x);
    expect(Number(icon!.getAttribute("data-y"))).toBeCloseTo(expected.y);
  });

  it("attaches the knife when the player has melee equipped", () => {
    render(
      <ReplayCanvasLayer
        match={playerMatch}
        round={round}
        frame={frameWithWeapon(KNIFE_WEAPON_ID)}
        currentTimeMs={0}
      />,
    );

    const weapon = getReplayWeaponIcon(KNIFE_WEAPON_ID)!;
    expect(weapon).toMatchObject({ name: "knife" });

    const icon = screen
      .getAllByTestId("canvas-icon")
      .find((node) => node.getAttribute("data-id") === "replay-weapon-0");
    expect(icon).toBeDefined();
    expect(icon).toHaveAttribute("data-src", "/tools/knife.webp");
    expect(icon).toHaveAttribute("data-width", String(weapon.width));
  });

  it("hides agent weapons when requested", () => {
    render(
      <ReplayCanvasLayer
        match={playerMatch}
        round={round}
        frame={frameWithWeapon(CLASSIC_WEAPON_ID)}
        currentTimeMs={0}
        hideAgentWeapons
      />,
    );

    expect(
      screen
        .queryAllByTestId("canvas-icon")
        .find((node) => node.getAttribute("data-id") === "replay-weapon-0"),
    ).toBeUndefined();
    expect(screen.getByTestId("canvas-icon")).toHaveAttribute(
      "data-id",
      "replay-agent-0-overlay",
    );
  });
});

describe("ReplayCanvasLayer weapon hits", () => {
  const shooter = {
    puuid: "blue-1",
    x: 1_000,
    y: 1_000,
    viewRadians: 0,
    hp: 100,
    credits: 0,
    alive: true,
  };
  const victim = {
    puuid: "red-1",
    x: 3_000,
    y: 1_500,
    viewRadians: Math.PI,
    hp: 80,
    credits: 0,
    alive: true,
  };
  const hitFrame: ReplayFrame = {
    timeMs: 1_000,
    players: [shooter, victim],
    spike: null,
  };
  const hitMatch = {
    ...match,
    players: [
      { puuid: "blue-1", teamId: "Blue", characterName: "Jett" },
      { puuid: "red-1", teamId: "Red", characterName: "Raze" },
    ],
  } as unknown as ReplayMatch;
  const hitRound = {
    ...round,
    durationMs: 2_000,
    frames: [hitFrame],
    hits: [{ timeMs: 1_000, shooterPuuid: "blue-1", victimPuuid: "red-1" }],
  } as unknown as ReplayRound;

  const tracer = () =>
    screen
      .queryAllByTestId("konva-line")
      .find((node) => node.id === "replay-tracer-0");

  it("draws a line that reaches the victim when the hit lands", () => {
    render(
      <ReplayCanvasLayer
        match={hitMatch}
        round={hitRound}
        frame={hitFrame}
        currentTimeMs={1_000}
      />,
    );

    const line = tracer();
    expect(line).toBeDefined();

    const points = (line!.getAttribute("points") ?? "")
      .split(",")
      .map(Number);
    expect(points).toHaveLength(4);

    const victimPoint = toReplayCanvasPoint({
      mapId: "pearl",
      mapSide: "defense",
      position: { x: victim.x, y: victim.y },
    })!;
    expect(points[2]).toBeCloseTo(victimPoint.x);
    expect(points[3]).toBeCloseTo(victimPoint.y);
  });

  it.each([
    ["Blue", "blue-1", "#42EEC7"],
    ["Red", "red-1", "#FF4655"],
  ] as const)("colors the %s team's weapon tracer", (teamId, shooterPuuid, color) => {
    render(
      <ReplayCanvasLayer
        match={hitMatch}
        round={{
          ...hitRound,
          hits: [
            {
              timeMs: 1_000,
              shooterPuuid,
              victimPuuid: shooterPuuid === "blue-1" ? "red-1" : "blue-1",
            },
          ],
        }}
        frame={hitFrame}
        currentTimeMs={1_000}
      />,
    );

    expect(tracer()).toHaveAttribute("data-stroke", color);
  });

  it("hides weapon hits when requested", () => {
    render(
      <ReplayCanvasLayer
        match={hitMatch}
        round={hitRound}
        frame={hitFrame}
        currentTimeMs={1_000}
        hideWeaponHits
      />,
    );

    expect(tracer()).toBeUndefined();
  });

  it("does not draw before the tracer travel window", () => {
    render(
      <ReplayCanvasLayer
        match={hitMatch}
        round={hitRound}
        frame={hitFrame}
        currentTimeMs={800}
      />,
    );

    expect(tracer()).toBeUndefined();
  });
});
