import type { AbilityCanvas } from "@/lib/types";
import {
  applyVisionConeAttachment,
  syncAttachedVisionConeNodePositions,
} from "@/lib/vision-cone-utils";
import Konva from "konva";

type MockNode = {
  x: jest.Mock<number, []>;
  y: jest.Mock<number, []>;
  position: jest.Mock<void, [{ x: number; y: number }]>;
  getLayer: jest.Mock<{ batchDraw: jest.Mock<void, []> }, []>;
};

const createMockNode = (x: number, y: number) => {
  const batchDraw = jest.fn<void, []>();

  const node = {
    x: jest.fn(() => x),
    y: jest.fn(() => y),
    position: jest.fn((nextPosition: { x: number; y: number }) => {
      x = nextPosition.x;
      y = nextPosition.y;
    }),
    getLayer: jest.fn(() => ({ batchDraw })),
  } satisfies MockNode;

  return {
    node: node as unknown as Konva.Node,
    position: () => ({ x, y }),
    batchDraw,
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
    expect(attachedCone.batchDraw).toHaveBeenCalledTimes(1);
    expect(detachedCone.position()).toEqual({ x: 30, y: 40 });
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
});
