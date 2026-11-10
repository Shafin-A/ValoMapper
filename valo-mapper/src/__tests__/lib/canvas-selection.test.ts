import {
  filterExistingSelection,
  getContextMenuCapabilities,
  getSelectableCanvasItems,
  isRectFullyInside,
  normalizeRect,
} from "@/lib/canvas-selection";
import type {
  AbilityCanvas,
  AgentCanvas,
  CanvasItemInstance,
  ImageCanvas,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";

const createAgent = (
  id: string,
  overrides: Partial<AgentCanvas> = {},
): AgentCanvas => ({
  id,
  name: "Jett",
  role: "Duelist",
  isAlly: true,
  x: 0,
  y: 0,
  ...overrides,
});

const createAbility = (
  id: string,
  overrides: Partial<AbilityCanvas> = {},
): AbilityCanvas => ({
  id,
  name: "Vision Cone 60",
  action: "vision_cone_60",
  isAlly: true,
  x: 0,
  y: 0,
  ...overrides,
});

const createText = (id: string): TextCanvas => ({
  id,
  text: "Hello",
  width: 100,
  height: 50,
  x: 0,
  y: 0,
});

const createImage = (id: string): ImageCanvas => ({
  id,
  src: "image.png",
  width: 100,
  height: 50,
  x: 0,
  y: 0,
});

const createToolIcon = (
  id: string,
  overrides: Partial<ToolIconCanvas> = {},
): ToolIconCanvas => ({
  id,
  name: "spike",
  width: 32,
  height: 32,
  x: 0,
  y: 0,
  ...overrides,
});

describe("canvas-selection helpers", () => {
  it("normalizes a rect regardless of drag direction", () => {
    expect(normalizeRect({ x: 100, y: 80 }, { x: 20, y: 10 })).toEqual({
      x: 20,
      y: 10,
      width: 80,
      height: 70,
    });
  });

  it("requires a rect to be fully inside the marquee", () => {
    const marquee = { x: 0, y: 0, width: 100, height: 100 };

    expect(
      isRectFullyInside({ x: 10, y: 10, width: 20, height: 20 }, marquee),
    ).toBe(true);
    expect(
      isRectFullyInside({ x: 90, y: 10, width: 20, height: 20 }, marquee),
    ).toBe(false);
  });

  it("excludes attached vision cones and attached tool icons", () => {
    const collections = {
      agentsOnCanvas: [createAgent("agent-1")],
      abilitiesOnCanvas: [
        createAbility("cone-attached", { attachedToId: "agent-1" }),
        createAbility("cone-free"),
        createAbility("smoke", { name: "Brimstone Smoke", action: "brim_smoke" }),
      ],
      textsOnCanvas: [createText("text-1")],
      imagesOnCanvas: [createImage("image-1")],
      toolIconsOnCanvas: [
        createToolIcon("tool-attached", { attachedToId: "agent-1" }),
        createToolIcon("tool-free"),
      ],
    };

    const ids = getSelectableCanvasItems(collections).map((item) => item.id);

    expect(ids).toEqual([
      "agent-1",
      "cone-free",
      "smoke",
      "text-1",
      "image-1",
      "tool-free",
    ]);
  });

  it("only enables ally toggle when every selected item shares the state", () => {
    const collections = {
      agentsOnCanvas: [
        createAgent("agent-1"),
        createAgent("agent-2", { isAlly: false }),
      ],
      abilitiesOnCanvas: [],
      textsOnCanvas: [],
      imagesOnCanvas: [],
      toolIconsOnCanvas: [],
    };

    const allAlly: CanvasItemInstance[] = [
      { type: "agent", item: createAgent("agent-1") },
      { type: "agent", item: createAgent("agent-2") },
    ];
    const mixed: CanvasItemInstance[] = [
      { type: "agent", item: createAgent("agent-1") },
      { type: "agent", item: createAgent("agent-2", { isAlly: false }) },
    ];

    expect(
      getContextMenuCapabilities(allAlly, collections).canToggleAlly,
    ).toBe(true);
    expect(
      getContextMenuCapabilities(mixed, collections).canToggleAlly,
    ).toBe(false);
  });

  it("hides agent-only options for mixed selections", () => {
    const collections = {
      agentsOnCanvas: [createAgent("agent-1")],
      abilitiesOnCanvas: [],
      textsOnCanvas: [createText("text-1")],
      imagesOnCanvas: [],
      toolIconsOnCanvas: [],
    };

    const capabilities = getContextMenuCapabilities(
      [
        { type: "agent", item: createAgent("agent-1") },
        { type: "text", item: createText("text-1") },
      ],
      collections,
    );

    expect(capabilities.canToggleAgentDead).toBe(false);
    expect(capabilities.canToggleAlly).toBe(false);
    expect(capabilities.canDelete).toBe(true);
    expect(capabilities.canDuplicate).toBe(true);
  });

  it("shares the ally toggle across agent and ability selections with matching states", () => {
    const collections = {
      agentsOnCanvas: [createAgent("agent-1")],
      abilitiesOnCanvas: [createAbility("ability-1")],
      textsOnCanvas: [],
      imagesOnCanvas: [],
      toolIconsOnCanvas: [],
    };

    const capabilities = getContextMenuCapabilities(
      [
        { type: "agent", item: createAgent("agent-1") },
        { type: "ability", item: createAbility("ability-1") },
      ],
      collections,
    );

    expect(capabilities.canToggleAlly).toBe(true);
    expect(capabilities.canToggleAgentDead).toBe(false);
  });

  it("only enables the dead toggle when all selected agents share state", () => {
    const collections = {
      agentsOnCanvas: [createAgent("agent-1"), createAgent("agent-2")],
      abilitiesOnCanvas: [],
      textsOnCanvas: [],
      imagesOnCanvas: [],
      toolIconsOnCanvas: [],
    };

    const mixed: CanvasItemInstance[] = [
      { type: "agent", item: createAgent("agent-1", { isGray: true }) },
      { type: "agent", item: createAgent("agent-2", { isGray: false }) },
    ];
    const matching: CanvasItemInstance[] = [
      { type: "agent", item: createAgent("agent-1", { isGray: true }) },
      { type: "agent", item: createAgent("agent-2", { isGray: true }) },
    ];

    expect(
      getContextMenuCapabilities(mixed, collections).canToggleAgentDead,
    ).toBe(false);
    expect(
      getContextMenuCapabilities(matching, collections).canToggleAgentDead,
    ).toBe(true);
  });

  it("only enables icon-only and range toggles when all abilities share state", () => {
    const collections = {
      agentsOnCanvas: [],
      abilitiesOnCanvas: [],
      textsOnCanvas: [],
      imagesOnCanvas: [],
      toolIconsOnCanvas: [],
    };

    const matchingIconOnly = getContextMenuCapabilities(
      [
        {
          type: "ability",
          item: createAbility("ability-1", {
            name: "Brimstone Smoke",
            action: "brim_smoke",
            iconOnly: false,
          }),
        },
        {
          type: "ability",
          item: createAbility("ability-2", {
            name: "Knife",
            action: "kayo_knife",
            iconOnly: false,
          }),
        },
      ],
      collections,
    );
    const mixedIconOnly = getContextMenuCapabilities(
      [
        {
          type: "ability",
          item: createAbility("ability-1", {
            name: "Brimstone Smoke",
            action: "brim_smoke",
            iconOnly: false,
          }),
        },
        {
          type: "ability",
          item: createAbility("ability-2", {
            name: "Knife",
            action: "kayo_knife",
            iconOnly: true,
          }),
        },
      ],
      collections,
    );

    expect(matchingIconOnly.canToggleAbilityIconOnly).toBe(true);
    expect(mixedIconOnly.canToggleAbilityIconOnly).toBe(false);

    const matchingRange = getContextMenuCapabilities(
      [
        { type: "ability", item: createAbility("ab-1", { action: "kj_alarmbot" }) },
        { type: "ability", item: createAbility("ab-2", { action: "kj_alarmbot" }) },
      ],
      collections,
    );
    const mixedRange = getContextMenuCapabilities(
      [
        { type: "ability", item: createAbility("ab-1", { action: "kj_alarmbot" }) },
        {
          type: "ability",
          item: createAbility("ab-2", {
            action: "kj_alarmbot",
            showOuterCircle: false,
          }),
        },
      ],
      collections,
    );

    expect(matchingRange.canToggleAbilityOuterCircle).toBe(true);
    expect(mixedRange.canToggleAbilityOuterCircle).toBe(false);
  });

  it("only enables swap when every selected ability is swappable", () => {
    const collections = {
      agentsOnCanvas: [],
      abilitiesOnCanvas: [],
      textsOnCanvas: [],
      imagesOnCanvas: [],
      toolIconsOnCanvas: [],
    };

    const swappable: CanvasItemInstance[] = [
      { type: "ability", item: createAbility("ab-1", { action: "miks_stun" }) },
      { type: "ability", item: createAbility("ab-2", { action: "miks_heal" }) },
    ];
    const partlySwappable: CanvasItemInstance[] = [
      { type: "ability", item: createAbility("ab-1", { action: "miks_stun" }) },
      {
        type: "ability",
        item: createAbility("ab-2", {
          name: "Brimstone Smoke",
          action: "brim_smoke",
        }),
      },
    ];

    expect(
      getContextMenuCapabilities(swappable, collections).canSwapAbility,
    ).toBe(true);
    expect(
      getContextMenuCapabilities(partlySwappable, collections).canSwapAbility,
    ).toBe(false);
  });

  it("only enables detach when every selected ability is an attached cone", () => {
    const collections = {
      agentsOnCanvas: [createAgent("agent-1")],
      abilitiesOnCanvas: [
        createAbility("cone-1", { attachedToId: "agent-1" }),
        createAbility("cone-2", { attachedToId: "agent-1" }),
      ],
      textsOnCanvas: [],
      imagesOnCanvas: [],
      toolIconsOnCanvas: [],
    };

    const allAttached: CanvasItemInstance[] = [
      {
        type: "ability",
        item: createAbility("cone-1", { attachedToId: "agent-1" }),
      },
      {
        type: "ability",
        item: createAbility("cone-2", { attachedToId: "agent-1" }),
      },
    ];
    const partlyAttached: CanvasItemInstance[] = [
      {
        type: "ability",
        item: createAbility("cone-1", { attachedToId: "agent-1" }),
      },
      { type: "ability", item: createAbility("cone-2") },
    ];

    expect(
      getContextMenuCapabilities(allAttached, collections).canDetachVisionCone,
    ).toBe(true);
    expect(
      getContextMenuCapabilities(partlyAttached, collections)
        .canDetachVisionCone,
    ).toBe(false);
  });

  it("filters selections that no longer exist on the canvas", () => {
    const collections = {
      agentsOnCanvas: [createAgent("agent-1")],
      abilitiesOnCanvas: [],
      textsOnCanvas: [],
      imagesOnCanvas: [],
      toolIconsOnCanvas: [],
    };

    const filtered = filterExistingSelection(collections, [
      { id: "agent-1", type: "agent" },
      { id: "removed-agent", type: "agent" },
      { id: "removed-text", type: "text" },
    ]);

    expect(filtered).toEqual([{ id: "agent-1", type: "agent" }]);
  });

  it("only enables attached cone removal when every selected host has a cone", () => {
    const collections = {
      agentsOnCanvas: [createAgent("agent-1"), createAgent("agent-2")],
      abilitiesOnCanvas: [
        createAbility("cone-1", { attachedToId: "agent-1" }),
      ],
      textsOnCanvas: [],
      imagesOnCanvas: [],
      toolIconsOnCanvas: [],
    };

    const withCone: CanvasItemInstance[] = [
      { type: "agent", item: createAgent("agent-1") },
    ];
    const hostWithoutCone: CanvasItemInstance[] = [
      { type: "agent", item: createAgent("agent-1") },
      { type: "agent", item: createAgent("agent-2") },
    ];

    expect(
      getContextMenuCapabilities(withCone, collections)
        .canRemoveAttachedVisionCone,
    ).toBe(true);
    expect(
      getContextMenuCapabilities(hostWithoutCone, collections)
        .canRemoveAttachedVisionCone,
    ).toBe(false);
  });
});
