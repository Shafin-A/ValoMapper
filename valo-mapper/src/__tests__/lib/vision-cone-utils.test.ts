import type { AbilityCanvas } from "@/lib/types";
import {
  applyVisionConeAttachment,
  createDefaultAttachedVisionCone,
  getAttachedVisionConeIds,
  isVisionOcclusionAction,
  syncAttachedVisionConeNodePositions,
} from "@/lib/vision-cone-utils";
import Konva from "konva";

describe("isVisionOcclusionAction", () => {
  it("includes vision cones and Killjoy's turret only", () => {
    expect(isVisionOcclusionAction("vision_cone_60")).toBe(true);
    expect(isVisionOcclusionAction("kj_turret")).toBe(true);
    expect(isVisionOcclusionAction("miks_ult")).toBe(false);
  });
});

describe("createDefaultAttachedVisionCone", () => {
  it("gives Cypher's Spycam a normal 103 vision cone", () => {
    const cone = createDefaultAttachedVisionCone(
      {
        id: "spycam-1",
        name: "Spycam",
        action: "icon",
        isAlly: true,
        x: 120,
        y: 140,
      },
      "cone-1",
    );

    expect(cone).toMatchObject({
      id: "cone-1",
      name: "Vision Cone 103",
      action: "vision_cone_103",
      x: 120,
      y: 140,
      isAlly: true,
      iconOnly: false,
      showOuterCircle: true,
      attachedToId: "spycam-1",
    });
  });

  it("does not add a cone to other icon-only abilities", () => {
    expect(
      createDefaultAttachedVisionCone(
        {
          id: "ability-1",
          name: "Neural Theft",
          action: "icon",
          isAlly: true,
          x: 0,
          y: 0,
        },
        "cone-1",
      ),
    ).toBeNull();
  });
});

type MockNode = {
  x: jest.Mock<number, []>;
  y: jest.Mock<number, []>;
  position: jest.Mock<void, [{ x: number; y: number }]>;
  getAttr: jest.Mock<unknown, [string]>;
  getLayer: jest.Mock<{ batchDraw: jest.Mock<void, []> }, []>;
};

const createMockNode = (x: number, y: number) => {
  const batchDraw = jest.fn<void, []>();
  const refreshVisionCone = jest.fn<void, [{ x: number; y: number }]>();

  const node = {
    x: jest.fn(() => x),
    y: jest.fn(() => y),
    position: jest.fn((nextPosition: { x: number; y: number }) => {
      x = nextPosition.x;
      y = nextPosition.y;
    }),
    getAttr: jest.fn((key: string) =>
      key === "refreshVisionCone" ? refreshVisionCone : undefined,
    ),
    getLayer: jest.fn(() => ({ batchDraw })),
  } satisfies MockNode;

  return {
    node: node as unknown as Konva.Node,
    position: () => ({ x, y }),
    batchDraw,
    refreshVisionCone,
  };
};

describe("syncAttachedVisionConeNodePositions", () => {
  it("moves attached cone nodes to the host position during drag", () => {
    const host = createMockNode(160, 220);
    const attachedCone = createMockNode(10, 20);
    const detachedCone = createMockNode(30, 40);

    const abilitiesOnCanvas: AbilityCanvas[] = [
      {
        id: "cone-attached",
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 10,
        y: 20,
        attachedToId: "agent-1",
      },
      {
        id: "cone-detached",
        name: "Vision Cone 30",
        action: "vision_cone_30",
        isAlly: true,
        x: 30,
        y: 40,
      },
    ];

    syncAttachedVisionConeNodePositions({
      hostId: "agent-1",
      hostNode: host.node,
      abilitiesOnCanvas,
      getRegisteredNode: (id) => {
        if (id === "cone-attached") {
          return attachedCone.node;
        }

        if (id === "cone-detached") {
          return detachedCone.node;
        }

        return undefined;
      },
    });

    expect(attachedCone.position()).toEqual({ x: 160, y: 220 });
    expect(attachedCone.refreshVisionCone).toHaveBeenCalledWith({
      x: 160,
      y: 220,
    });
    expect(attachedCone.batchDraw).toHaveBeenCalledTimes(1);
    expect(detachedCone.position()).toEqual({ x: 30, y: 40 });
    expect(detachedCone.refreshVisionCone).not.toHaveBeenCalled();
    expect(detachedCone.batchDraw).not.toHaveBeenCalled();
  });
});

describe("applyVisionConeAttachment", () => {
  it("removes any older cone already attached to the same host", () => {
    const nextAbility: AbilityCanvas = {
      id: "cone-new",
      name: "Vision Cone 60",
      action: "vision_cone_60",
      isAlly: true,
      x: 120,
      y: 140,
      attachedToId: "agent-1",
    };

    const { nextAbilitiesOnCanvas, removedAbilityIds } =
      applyVisionConeAttachment({
        abilitiesOnCanvas: [
          {
            id: "temp-drag",
            name: "Vision Cone 60",
            action: "vision_cone_60",
            isAlly: true,
            x: 0,
            y: 0,
          },
          {
            id: "cone-old",
            name: "Vision Cone 30",
            action: "vision_cone_30",
            isAlly: true,
            x: 50,
            y: 60,
            attachedToId: "agent-1",
          },
        ],
        previousAbilityId: "temp-drag",
        nextAbility,
      });

    expect(nextAbilitiesOnCanvas).toEqual([nextAbility]);
    expect(removedAbilityIds).toEqual(["cone-old"]);
  });

  it("ignores icon-only vision cones when listing attached cones for a host", () => {
    expect(
      getAttachedVisionConeIds(
        [
          {
            id: "cone-hidden",
            name: "Vision Cone 60",
            action: "vision_cone_60",
            isAlly: true,
            x: 40,
            y: 60,
            iconOnly: true,
            attachedToId: "agent-1",
          },
          {
            id: "cone-visible",
            name: "Vision Cone 30",
            action: "vision_cone_30",
            isAlly: true,
            x: 40,
            y: 60,
            attachedToId: "agent-1",
          },
        ],
        "agent-1",
      ),
    ).toEqual(["cone-visible"]);
  });
});
