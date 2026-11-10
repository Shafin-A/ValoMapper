import { renderHook, act } from "@testing-library/react";
import { useCanvasContextMenu } from "@/hooks/canvas/use-canvas-context-menu";
import { getNextId } from "@/lib/utils";
import type { Stage } from "konva/lib/Stage";
import type { KonvaEventObject } from "konva/lib/Node";
import type {
  AgentCanvas,
  AbilityCanvas,
  ConnectingLine,
  ToolIconCanvas,
} from "@/lib/types";

jest.mock("@/lib/utils", () => {
  const actual = jest.requireActual("@/lib/utils");
  return {
    ...actual,
    getNextId: jest.fn(() => "new-id"),
  };
});

const mockGetNextId = getNextId as jest.MockedFunction<typeof getNextId>;

type StageMock = {
  container: () => {
    getBoundingClientRect: () => { left: number; top: number };
  };
  getPointerPosition: () => { x: number; y: number } | null;
};

const createStageMock = (): StageMock => ({
  container: () => ({ getBoundingClientRect: () => ({ left: 5, top: 7 }) }),
  getPointerPosition: () => ({ x: 10, y: 20 }),
});

describe("useCanvasContextMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNextId.mockReturnValue("new-id");
  });

  it("opens context menu for an agent target", () => {
    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const agents: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 0, y: 0 },
    ];

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agents,
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    const evt = {
      evt: { preventDefault: jest.fn() },
      target: { id: () => "a1" },
    } as unknown as KonvaEventObject<PointerEvent>;

    act(() => {
      result.current.handleContextMenu(evt);
    });

    expect(evt.evt.preventDefault).toHaveBeenCalled();
    expect(result.current.contextMenu).toMatchObject({
      open: true,
      x: 15,
      y: 27,
      anchorId: "a1",
      anchorType: "agent",
    });
  });

  it("duplicates an agent with offset and new id", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const agents: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 1, y: 2 },
    ];

    let agentsState = agents;
    const setAgents = jest.fn((updater) => {
      agentsState =
        typeof updater === "function" ? updater(agentsState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agentsState,
        setAgents,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "a1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDuplicate();
    });

    expect(setAgents).toHaveBeenCalled();
    expect(agentsState).toHaveLength(2);
    expect(agentsState[1]).toMatchObject({ id: "new-id", x: 41, y: 42 });
  });

  it("duplicates an agent with its attached vision cone", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let agentsState: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 1, y: 2 },
    ];
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "cone-1",
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 1,
        y: 2,
        attachedToId: "a1",
      },
    ];

    const setAgents = jest.fn((updater) => {
      agentsState =
        typeof updater === "function" ? updater(agentsState) : updater;
    });
    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    mockGetNextId
      .mockReturnValueOnce("agent-copy")
      .mockReturnValueOnce("cone-copy");

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agentsState,
        setAgents,
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "a1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDuplicate();
    });

    expect(agentsState).toHaveLength(2);
    expect(agentsState[1]).toMatchObject({ id: "agent-copy", x: 41, y: 42 });
    expect(abilitiesState).toHaveLength(2);
    expect(abilitiesState[1]).toMatchObject({
      id: "cone-copy",
      attachedToId: "agent-copy",
      x: 41,
      y: 42,
    });
  });

  it("duplicates an ability host with its attached vision cone when the cone is targeted", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "ability-1",
        name: "knife",
        action: "kayo_knife",
        isAlly: true,
        x: 10,
        y: 20,
      },
      {
        id: "cone-1",
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 10,
        y: 20,
        attachedToId: "ability-1",
      },
    ];

    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    mockGetNextId
      .mockReturnValueOnce("ability-copy")
      .mockReturnValueOnce("cone-copy");

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "cone-1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDuplicate();
    });

    expect(abilitiesState).toHaveLength(4);
    expect(abilitiesState[2]).toMatchObject({
      id: "ability-copy",
      action: "kayo_knife",
      x: 50,
      y: 60,
    });
    expect(abilitiesState[3]).toMatchObject({
      id: "cone-copy",
      attachedToId: "ability-copy",
      x: 50,
      y: 60,
    });
  });

  it("deletes an ability when delete is invoked", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const abilities: AbilityCanvas[] = [
      {
        id: "ab1",
        name: "knife",
        action: "kayo_knife",
        isAlly: false,
        x: 0,
        y: 0,
      },
    ];
    let abilityState = abilities;
    const setAbilities = jest.fn((updater) => {
      abilityState =
        typeof updater === "function" ? updater(abilityState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        abilityState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "ab1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDelete();
    });

    expect(abilityState).toHaveLength(0);
  });

  it("deletes an agent and its attached vision cone", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let agentsState: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 0, y: 0 },
    ];
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "cone-1",
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 0,
        y: 0,
        attachedToId: "a1",
      },
    ];

    const setAgents = jest.fn((updater) => {
      agentsState =
        typeof updater === "function" ? updater(agentsState) : updater;
    });
    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agentsState,
        setAgents,
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "a1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDelete();
    });

    expect(agentsState).toHaveLength(0);
    expect(abilitiesState).toHaveLength(0);
  });

  it("deletes an ability host and its attached vision cone when the cone is targeted", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "ability-1",
        name: "knife",
        action: "kayo_knife",
        isAlly: true,
        x: 10,
        y: 20,
      },
      {
        id: "cone-1",
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 10,
        y: 20,
        attachedToId: "ability-1",
      },
    ];

    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "cone-1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDelete();
    });

    expect(abilitiesState).toHaveLength(0);
  });

  it("detaches an attached vision cone", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const agents: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 40, y: 50 },
    ];
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "cone-1",
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 0,
        y: 0,
        attachedToId: "a1",
      },
    ];

    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agents,
        jest.fn(),
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "cone-1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDetachVisionCone();
    });

    expect(abilitiesState[0]).toMatchObject({
      attachedToId: undefined,
      x: 40,
      y: 50,
    });
  });

  it("removes an attached vision cone from an agent host", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const agents: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 40, y: 50 },
    ];
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "cone-1",
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 40,
        y: 50,
        attachedToId: "a1",
      },
    ];

    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agents,
        jest.fn(),
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "a1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleRemoveAttachedVisionCone();
    });

    expect(abilitiesState).toHaveLength(0);
  });

  it("removes an attached vision cone from an ability host", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "ability-1",
        name: "knife",
        action: "kayo_knife",
        isAlly: true,
        x: 10,
        y: 20,
      },
      {
        id: "cone-1",
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 10,
        y: 20,
        attachedToId: "ability-1",
      },
    ];

    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "ability-1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleRemoveAttachedVisionCone();
    });

    expect(abilitiesState).toEqual([
      expect.objectContaining({
        id: "ability-1",
      }),
    ]);
  });

  it("toggles ally flag for an agent", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let agentsState: AgentCanvas[] = [
      { id: "a1", name: "Sova", role: "Initiator", isAlly: false, x: 0, y: 0 },
    ];
    const setAgents = jest.fn((updater) => {
      agentsState =
        typeof updater === "function" ? updater(agentsState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agentsState,
        setAgents,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "a1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleToggleAlly();
    });

    expect(agentsState[0].isAlly).toBe(true);
  });

  it("toggles dead state for an agent", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let agentsState: AgentCanvas[] = [
      {
        id: "a1",
        name: "Sova",
        role: "Initiator",
        isAlly: false,
        isGray: false,
        x: 0,
        y: 0,
      },
    ];
    const setAgents = jest.fn((updater) => {
      agentsState =
        typeof updater === "function" ? updater(agentsState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agentsState,
        setAgents,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "a1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleToggleAgentDead();
    });

    expect(agentsState[0].isGray).toBe(true);
  });

  it("toggles outer circle for circle ability", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "ab1",
        name: "Circle",
        action: "kj_alarmbot",
        isAlly: true,
        x: 0,
        y: 0,
        showOuterCircle: true,
      },
    ];
    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "ab1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleToggleAbilityOuterCircle();
    });

    expect(abilitiesState[0].showOuterCircle).toBe(false);
  });

  it("ignores context menu on unknown target", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "unknown" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    expect(result.current.contextMenu.open).toBe(false);
  });

  it("ignores context menu when target is the stage itself", () => {
    const stage = createStageMock();
    const stageRef = { current: stage as unknown as Stage };

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: stage,
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    expect(result.current.contextMenu.open).toBe(false);
  });

  it("uses parent id when target id is not available", () => {
    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const agents: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 0, y: 0 },
    ];

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agents,
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    const evt = {
      evt: { preventDefault: jest.fn() },
      target: { id: () => "", parent: { id: () => "a1" } },
    } as unknown as KonvaEventObject<PointerEvent>;

    act(() => {
      result.current.handleContextMenu(evt);
    });

    expect(result.current.contextMenu.anchorId).toBe("a1");
  });

  it("uses a grandparent id for nested canvas items", () => {
    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const texts = [
      { id: "t1", text: "Hello", width: 100, height: 50, x: 0, y: 0 },
    ];

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        [],
        jest.fn(),
        texts,
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    const grandparent = { id: () => "t1" };
    const parent = { id: () => "", getParent: () => grandparent };
    const evt = {
      evt: { preventDefault: jest.fn() },
      target: { id: () => "", getParent: () => parent },
    } as unknown as KonvaEventObject<PointerEvent>;

    act(() => {
      result.current.handleContextMenu(evt);
    });

    expect(result.current.contextMenu).toMatchObject({
      open: true,
      anchorId: "t1",
      anchorType: "text",
    });
  });

  it("opens context menu for text item", () => {
    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const texts = [
      { id: "t1", text: "Hello", width: 100, height: 50, x: 0, y: 0 },
    ];

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        [],
        jest.fn(),
        texts,
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "t1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    expect(result.current.contextMenu.anchorType).toBe("text");
  });

  it("opens context menu for image item", () => {
    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const images = [
      { id: "i1", src: "/test.png", width: 100, height: 50, x: 0, y: 0 },
    ];

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        images,
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "i1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    expect(result.current.contextMenu.anchorType).toBe("image");
  });

  it("opens context menu for tool icon item", () => {
    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const toolIcons = [
      { id: "tool1", name: "spike", width: 50, height: 50, x: 0, y: 0 },
    ];

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        toolIcons,
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "tool1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    expect(result.current.contextMenu.anchorType).toBe("tool");
  });

  it("duplicates a text item", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const texts = [
      { id: "t1", text: "Hello", width: 100, height: 50, x: 5, y: 10 },
    ];

    let textState = texts;
    const setTexts = jest.fn((updater) => {
      textState = typeof updater === "function" ? updater(textState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        [],
        jest.fn(),
        textState,
        setTexts,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "t1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDuplicate();
    });

    expect(textState).toHaveLength(2);
    expect(textState[1]).toMatchObject({ id: "new-id", x: 45, y: 50 });
  });

  it("duplicates an image item", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const images = [
      { id: "i1", src: "/test.png", width: 100, height: 50, x: 10, y: 20 },
    ];

    let imageState = images;
    const setImages = jest.fn((updater) => {
      imageState =
        typeof updater === "function" ? updater(imageState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        imageState,
        setImages,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "i1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDuplicate();
    });

    expect(imageState).toHaveLength(2);
    expect(imageState[1]).toMatchObject({ id: "new-id", x: 50, y: 60 });
  });

  it("duplicates a tool icon item", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const toolIcons = [
      { id: "tool1", name: "spike", width: 50, height: 50, x: 15, y: 25 },
    ];

    let toolState = toolIcons;
    const setToolIcons = jest.fn((updater) => {
      toolState = typeof updater === "function" ? updater(toolState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        toolState,
        setToolIcons,
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "tool1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDuplicate();
    });

    expect(toolState).toHaveLength(2);
    expect(toolState[1]).toMatchObject({ id: "new-id", x: 55, y: 65 });
  });

  it("deletes a text item", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const texts = [
      { id: "t1", text: "Hello", width: 100, height: 50, x: 0, y: 0 },
    ];
    let textState = texts;
    const setTexts = jest.fn((updater) => {
      textState = typeof updater === "function" ? updater(textState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        [],
        jest.fn(),
        textState,
        setTexts,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "t1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDelete();
    });

    expect(textState).toHaveLength(0);
  });

  it("deletes an image item", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const images = [
      { id: "i1", src: "/test.png", width: 100, height: 50, x: 0, y: 0 },
    ];
    let imageState = images;
    const setImages = jest.fn((updater) => {
      imageState =
        typeof updater === "function" ? updater(imageState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        imageState,
        setImages,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "i1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDelete();
    });

    expect(imageState).toHaveLength(0);
  });

  it("deletes a tool icon item", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const toolIcons = [
      { id: "tool1", name: "spike", width: 50, height: 50, x: 0, y: 0 },
    ];
    let toolState = toolIcons;
    const setToolIcons = jest.fn((updater) => {
      toolState = typeof updater === "function" ? updater(toolState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        toolState,
        setToolIcons,
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "tool1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDelete();
    });

    expect(toolState).toHaveLength(0);
  });

  it("toggles ally flag for an ability", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "ab1",
        name: "smoke",
        action: "brim_smoke",
        isAlly: true,
        x: 0,
        y: 0,
      },
    ];
    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "ab1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleToggleAlly();
    });

    expect(abilitiesState[0].isAlly).toBe(false);
  });

  it("toggles icon-only mode for an ability", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "ab1",
        name: "smoke",
        action: "brim_smoke",
        isAlly: true,
        x: 0,
        y: 0,
        iconOnly: false,
      },
    ];
    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "ab1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleToggleAbilityIconOnly();
    });

    expect(abilitiesState[0].iconOnly).toBe(true);
  });

  it("detaches an attached vision cone when toggling it to icon-only mode", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "cone-1",
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 0,
        y: 0,
        iconOnly: false,
        attachedToId: "agent-1",
      },
    ];
    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "cone-1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleToggleAbilityIconOnly();
    });

    expect(abilitiesState[0]).toMatchObject({
      iconOnly: true,
      attachedToId: undefined,
    });
  });

  it("handles popover open change", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handlePopoverOpenChange(true);
    });

    expect(result.current.contextMenu.open).toBe(true);

    act(() => {
      result.current.handlePopoverOpenChange(false);
    });

    expect(result.current.contextMenu.open).toBe(false);
  });

  it("closes context menu after duplicate", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const agents: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 0, y: 0 },
    ];

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agents,
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "a1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    expect(result.current.contextMenu.open).toBe(true);

    act(() => {
      result.current.handleDuplicate();
    });

    expect(result.current.contextMenu.open).toBe(false);
  });

  it("targets the whole selection when right-clicking a selected item", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const agents: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 0, y: 0 },
      { id: "a2", name: "Sova", role: "Initiator", isAlly: true, x: 10, y: 10 },
    ];
    const selected = [
      { id: "a1", type: "agent" as const },
      { id: "a2", type: "agent" as const },
    ];
    const setSelected = jest.fn();

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agents,
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        selected,
        setSelected,
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "a1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    expect(result.current.contextMenu.targetItems).toHaveLength(2);
    expect(result.current.contextMenu.capabilities.canToggleAlly).toBe(true);
    expect(setSelected).not.toHaveBeenCalled();
  });

  it("hides the ally toggle when the selection has mixed ally states", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const agents: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 0, y: 0 },
      { id: "a2", name: "Sova", role: "Initiator", isAlly: false, x: 10, y: 10 },
    ];
    const selected = [
      { id: "a1", type: "agent" as const },
      { id: "a2", type: "agent" as const },
    ];

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agents,
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        selected,
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "a1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    expect(result.current.contextMenu.capabilities.canToggleAlly).toBe(false);
  });

  it("deletes every item in the selection", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let agentsState: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 0, y: 0 },
      { id: "a2", name: "Sova", role: "Initiator", isAlly: true, x: 10, y: 10 },
    ];
    const setAgents = jest.fn((updater) => {
      agentsState =
        typeof updater === "function" ? updater(agentsState) : updater;
    });
    let selected = [
      { id: "a1", type: "agent" as const },
      { id: "a2", type: "agent" as const },
    ];
    const setSelected = jest.fn((updater) => {
      selected = typeof updater === "function" ? updater(selected) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agentsState,
        setAgents,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        selected,
        setSelected,
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "a1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDelete();
    });

    expect(agentsState).toHaveLength(0);
    expect(selected).toHaveLength(0);
  });

  it("toggles ally state for every selected agent", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let agentsState: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 0, y: 0 },
      { id: "a2", name: "Sova", role: "Initiator", isAlly: true, x: 10, y: 10 },
    ];
    const setAgents = jest.fn((updater) => {
      agentsState =
        typeof updater === "function" ? updater(agentsState) : updater;
    });
    const selected = [
      { id: "a1", type: "agent" as const },
      { id: "a2", type: "agent" as const },
    ];

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agentsState,
        setAgents,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        selected,
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "a1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleToggleAlly();
    });

    expect(agentsState.map((agent) => agent.isAlly)).toEqual([false, false]);
  });

  it("cleans up attachments and connected items when deleting a selection", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };

    let agentsState: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 0, y: 0 },
      { id: "a2", name: "Sova", role: "Initiator", isAlly: true, x: 10, y: 10 },
    ];
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "cone-1",
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 0,
        y: 0,
        attachedToId: "a1",
      },
      {
        id: "ability-1",
        name: "Knife",
        action: "kayo_knife",
        isAlly: true,
        x: 10,
        y: 10,
      },
    ];
    let toolIconsState: ToolIconCanvas[] = [
      {
        id: "tool-1",
        name: "spike",
        width: 32,
        height: 32,
        x: 5,
        y: 5,
        attachedToId: "a1",
      },
    ];
    let connectingLinesState: ConnectingLine[] = [
      {
        id: "line-1",
        fromId: "a2",
        toId: "ability-1",
        strokeColor: "#ffffff",
        strokeWidth: 2,
      },
    ];
    const selected = [
      { id: "a1", type: "agent" as const },
      { id: "a2", type: "agent" as const },
    ];

    const setAgents = jest.fn((updater) => {
      agentsState =
        typeof updater === "function" ? updater(agentsState) : updater;
    });
    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });
    const setToolIcons = jest.fn((updater) => {
      toolIconsState =
        typeof updater === "function" ? updater(toolIconsState) : updater;
    });
    const setConnectingLines = jest.fn((updater) => {
      connectingLinesState =
        typeof updater === "function"
          ? updater(connectingLinesState)
          : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agentsState,
        setAgents,
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        toolIconsState,
        setToolIcons,
        connectingLinesState,
        setConnectingLines,
        selected,
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "a1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDelete();
    });

    expect(agentsState).toHaveLength(0);
    expect(abilitiesState).toHaveLength(0);
    expect(toolIconsState).toHaveLength(0);
    expect(connectingLinesState).toHaveLength(0);
  });

  it("duplicates every selected host with its attached vision cone", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    const agents: AgentCanvas[] = [
      { id: "a1", name: "Jett", role: "Duelist", isAlly: true, x: 0, y: 0 },
      { id: "a2", name: "Sova", role: "Initiator", isAlly: true, x: 10, y: 10 },
    ];
    let agentsState = [...agents];
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "cone-1",
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 0,
        y: 0,
        attachedToId: "a1",
      },
      {
        id: "cone-2",
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 10,
        y: 10,
        attachedToId: "a2",
      },
    ];
    const selected = [
      { id: "a1", type: "agent" as const },
      { id: "a2", type: "agent" as const },
    ];
    const setAgents = jest.fn((updater) => {
      agentsState =
        typeof updater === "function" ? updater(agentsState) : updater;
    });
    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    mockGetNextId
      .mockReturnValueOnce("agent-copy-1")
      .mockReturnValueOnce("cone-copy-1")
      .mockReturnValueOnce("agent-copy-2")
      .mockReturnValueOnce("cone-copy-2");

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        agentsState,
        setAgents,
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        selected,
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "a1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleDuplicate();
    });

    expect(agentsState).toHaveLength(4);
    expect(abilitiesState).toHaveLength(4);
    expect(agentsState.map((agent) => agent.id)).toEqual([
      "a1",
      "a2",
      "agent-copy-1",
      "agent-copy-2",
    ]);
    expect(
      abilitiesState.filter((ability) => ability.attachedToId === "agent-copy-1"),
    ).toHaveLength(1);
    expect(
      abilitiesState.filter((ability) => ability.attachedToId === "agent-copy-2"),
    ).toHaveLength(1);
  });

  it("toggles icon-only mode for every selected ability", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "ab1",
        name: "Brimstone Smoke",
        action: "brim_smoke",
        isAlly: true,
        x: 0,
        y: 0,
        iconOnly: false,
      },
      {
        id: "ab2",
        name: "Knife",
        action: "kayo_knife",
        isAlly: true,
        x: 10,
        y: 10,
        iconOnly: false,
      },
    ];
    const selected = [
      { id: "ab1", type: "ability" as const },
      { id: "ab2", type: "ability" as const },
    ];
    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        selected,
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "ab1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleToggleAbilityIconOnly();
    });

    expect(abilitiesState.map((ability) => ability.iconOnly)).toEqual([
      true,
      true,
    ]);
  });

  it("swaps every selected swappable ability", () => {
    const stageRef = { current: createStageMock() as unknown as Stage };
    let abilitiesState: AbilityCanvas[] = [
      {
        id: "ab1",
        name: "M-Pulse Concuss",
        action: "miks_stun",
        isAlly: true,
        x: 0,
        y: 0,
      },
      {
        id: "ab2",
        name: "M-Pulse Heal",
        action: "miks_heal",
        isAlly: true,
        x: 10,
        y: 10,
      },
    ];
    const selected = [
      { id: "ab1", type: "ability" as const },
      { id: "ab2", type: "ability" as const },
    ];
    const setAbilities = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    const { result } = renderHook(() =>
      useCanvasContextMenu(
        stageRef,
        [],
        jest.fn(),
        abilitiesState,
        setAbilities,
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        [],
        jest.fn(),
        selected,
        jest.fn(),
      ),
    );

    act(() => {
      result.current.handleContextMenu({
        evt: { preventDefault: jest.fn() },
        target: { id: () => "ab1" },
      } as unknown as KonvaEventObject<PointerEvent>);
    });

    act(() => {
      result.current.handleSwapAbility();
    });

    expect(abilitiesState.map((ability) => ability.action)).toEqual([
      "miks_heal",
      "miks_stun",
    ]);
  });
});
