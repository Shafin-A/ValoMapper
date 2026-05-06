import { renderHook, act } from "@testing-library/react";
import { TEMP_DRAG_ID } from "@/lib/consts";
import type { AbilityCanvas, AgentCanvas, ToolIconCanvas } from "@/lib/types";
import type { Stage } from "konva/lib/Stage";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { getNextId } from "@/lib/utils";
import { useCanvasEvents } from "@/hooks/canvas/use-canvas-events";
import { useCanvasContextMenu } from "@/hooks/canvas/use-canvas-context-menu";
import { useCanvasDrawing } from "@/hooks/canvas/use-canvas-drawing";
import { useCanvasZoom } from "@/hooks/canvas/use-canvas-zoom";

type StageMock = {
  getPointerPosition: jest.Mock<{ x: number; y: number } | undefined, []>;
  position: jest.Mock<{ x: number; y: number }>;
  scaleX: jest.Mock<number>;
  findOne: jest.Mock<{ position: jest.Mock } | null, [string?]>;
  container: jest.Mock;
  setPointersPositions: jest.Mock;
  draggable: jest.Mock;
  isDragging: jest.Mock<boolean>;
};

jest.mock("@/contexts/canvas-context", () => ({
  useCanvas: jest.fn(),
}));

jest.mock("@/contexts/settings-context", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/hooks/canvas/use-canvas-zoom");
jest.mock("@/hooks/canvas/use-canvas-drawing");
jest.mock("@/hooks/canvas/use-canvas-context-menu");

jest.mock("@/lib/utils", () => {
  const actual = jest.requireActual("@/lib/utils");
  return {
    ...actual,
    getNextId: jest.fn(() => "agent-new"),
  };
});

const mockUseCanvas = useCanvas as jest.MockedFunction<typeof useCanvas>;
const mockUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;
const mockUseCanvasZoom = useCanvasZoom as jest.MockedFunction<
  typeof useCanvasZoom
>;
const mockUseCanvasDrawing = useCanvasDrawing as jest.MockedFunction<
  typeof useCanvasDrawing
>;
const mockUseCanvasContextMenu = useCanvasContextMenu as jest.MockedFunction<
  typeof useCanvasContextMenu
>;
const mockGetNextId = getNextId as jest.MockedFunction<typeof getNextId>;

const createStageMock = (overrides: Partial<StageMock> = {}): StageMock => ({
  getPointerPosition: jest.fn(() => ({ x: 10, y: 20 })),
  position: jest.fn(() => ({ x: 2, y: 4 })),
  scaleX: jest.fn(() => 2),
  findOne: jest.fn(() => null),
  container: jest.fn(() => ({
    contains: jest.fn(() => false),
    getBoundingClientRect: jest.fn(
      () =>
        ({
          left: 0,
          top: 0,
          right: 500,
          bottom: 500,
          width: 500,
          height: 500,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    ),
    style: {},
  })),
  setPointersPositions: jest.fn(),
  draggable: jest.fn(),
  isDragging: jest.fn(() => false),
  ...overrides,
});

const createCanvasContext = (
  overrides: Partial<ReturnType<typeof mockUseCanvas>> = {},
) =>
  ({
    selectedCanvasIcon: null,
    setSelectedCanvasIcon: jest.fn(),
    isSidebarDragActive: false,
    setIsSidebarDragActive: jest.fn(),
    currentStageScale: 1,
    setCurrentStageScale: jest.fn(),
    agentsOnCanvas: [],
    setAgentsOnCanvas: jest.fn(),
    abilitiesOnCanvas: [],
    setAbilitiesOnCanvas: jest.fn(),
    textsOnCanvas: [],
    setTextsOnCanvas: jest.fn(),
    imagesOnCanvas: [],
    setImagesOnCanvas: jest.fn(),
    toolIconsOnCanvas: [],
    setToolIconsOnCanvas: jest.fn(),
    isDrawMode: false,
    isDrawing: { current: false },
    drawLines: [],
    setDrawLines: jest.fn(),
    tool: "pencil" as const,
    setCurrentStroke: jest.fn(),
    isAlly: true,
    setIsAlly: jest.fn(),
    selectedMap: { id: "map", text: "map", textColor: "#fff" },
    setSelectedMap: jest.fn(),
    mapSide: "attackers",
    setMapSide: jest.fn(),
    isDeleteSettingsOpen: false,
    setIsDeleteSettingsOpen: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    canUndo: false,
    canRedo: false,
    saveToHistory: jest.fn(),
    history: [],
    resetState: jest.fn(),
    editingTextId: null,
    setEditingTextId: jest.fn(),
    phases: [],
    currentPhaseIndex: 0,
    switchToPhase: jest.fn(),
    duplicatePhase: jest.fn(),
    editedPhases: new Set<number>(),
    transitionToPhase: jest.fn(),
    registerNode: jest.fn(),
    unregisterNode: jest.fn(),
    isTransitioning: { current: false },
    isLoadingLobby: false,
    isErrorLobby: false,
    lobbyError: null,
    hoveredElementId: null,
    setHoveredElementId: jest.fn(),
    recenterCanvasCallback: { current: null },
    ...overrides,
  }) as unknown as ReturnType<typeof useCanvas>;

describe("useCanvasEvents", () => {
  const handleDrawingMock = jest.fn();
  const handleMouseUpMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNextId.mockReturnValue("agent-new");

    mockUseSettings.mockReturnValue({
      agentsSettings: {
        scale: 35,
        borderOpacity: 1,
        borderWidth: 3,
        radius: 8,
        allyColor: "#18636c",
        enemyColor: "#FF4655",
      },
      abilitiesSettings: {
        scale: 35,
        borderOpacity: 1,
        borderWidth: 3,
        radius: 8,
        allyColor: "#18636c",
        enemyColor: "#FF4655",
      },
      drawSettings: {
        size: 1,
        color: "#000000",
        isDashed: false,
        isArrowHead: false,
        shape: "freehand" as const,
        opacity: 1,
      },
      eraserSettings: { size: 10, mode: "pixel" },
      updateAgentsSettings: jest.fn(),
      updateAbilitiesSettings: jest.fn(),
      updateDrawSettings: jest.fn(),
      updateEraserSettings: jest.fn(),
    });

    mockUseCanvasZoom.mockReturnValue({
      deleteGroupRef: { current: null },
      handleDragMove: jest.fn(),
      handleWheel: jest.fn(),
      handleTouchStart: jest.fn(),
      handleTouchMove: jest.fn(),
      handleTouchEnd: jest.fn(),
    });

    mockUseCanvasDrawing.mockReturnValue({
      handleDrawing: handleDrawingMock,
      handleMouseUp: handleMouseUpMock,
      currentLineRef: { current: null },
    });

    mockUseCanvasContextMenu.mockReturnValue({
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        itemId: "",
        itemType: "agent",
      },
      handleContextMenu: jest.fn(),
      handlePopoverOpenChange: jest.fn(),
      handleDuplicate: jest.fn(),
      handleDelete: jest.fn(),
      handleToggleAlly: jest.fn(),
      handleSwapAbility: jest.fn(),
      handleToggleAbilityIconOnly: jest.fn(),
      handleToggleAbilityOuterCircle: jest.fn(),
      handleRemoveAttachedVisionCone: jest.fn(),
      handleDetachVisionCone: jest.fn(),
      closeContextMenu: jest.fn(),
    });
  });

  it("starts drawing when clicking the stage in draw mode", () => {
    mockUseCanvas.mockReturnValue(
      createCanvasContext({
        isDrawMode: true,
      }),
    );

    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasEvents(stageRef, 1));

    act(() => {
      result.current.handleStageClick();
    });

    expect(handleDrawingMock).toHaveBeenCalledTimes(1);
  });

  it("places a selected agent and clears the selection on click", () => {
    let agentsState: AgentCanvas[] = [
      {
        id: TEMP_DRAG_ID,
        name: "Jett",
        role: "Duelist",
        isAlly: true,
        x: 0,
        y: 0,
      },
    ];

    const setAgentsOnCanvas = jest.fn((updater) => {
      agentsState =
        typeof updater === "function" ? updater(agentsState) : updater;
    });

    const setSelectedCanvasIcon = jest.fn();

    mockUseCanvas.mockReturnValue(
      createCanvasContext({
        selectedCanvasIcon: { name: "Jett", role: "Duelist" },
        setSelectedCanvasIcon,
        agentsOnCanvas: agentsState,
        setAgentsOnCanvas,
      }),
    );

    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasEvents(stageRef, 1));

    act(() => {
      result.current.handleStageClick();
    });

    expect(setAgentsOnCanvas).toHaveBeenCalled();
    expect(agentsState).toHaveLength(1);
    expect(agentsState[0]).toMatchObject({
      id: "agent-new",
      x: 4,
      y: 8,
    });
    expect(setSelectedCanvasIcon).toHaveBeenCalledWith(null);
  });

  it("places a selected tool icon and clears selection on click", () => {
    let toolIconsState: ToolIconCanvas[] = [
      {
        id: TEMP_DRAG_ID,
        name: "spike",
        width: 32,
        height: 32,
        x: 0,
        y: 0,
      },
    ];

    const setToolIconsOnCanvas = jest.fn((updater) => {
      toolIconsState =
        typeof updater === "function" ? updater(toolIconsState) : updater;
    });

    const setSelectedCanvasIcon = jest.fn();

    mockGetNextId.mockReturnValue("tool-new");

    mockUseCanvas.mockReturnValue(
      createCanvasContext({
        selectedCanvasIcon: {
          id: TEMP_DRAG_ID,
          name: "spike",
          width: 32,
          height: 32,
          x: 0,
          y: 0,
        },
        setSelectedCanvasIcon,
        toolIconsOnCanvas: toolIconsState,
        setToolIconsOnCanvas,
      }),
    );

    const stageRef = {
      current: createStageMock({
        findOne: jest.fn(() => ({ position: jest.fn(() => ({ x: 4, y: 8 })) })),
      }) as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasEvents(stageRef, 1));

    act(() => {
      result.current.handleStageClick();
    });

    expect(setToolIconsOnCanvas).toHaveBeenCalled();
    expect(toolIconsState).toHaveLength(1);
    expect(toolIconsState[0]).toMatchObject({
      id: "tool-new",
      x: 4,
      y: 8,
    });
    expect(setSelectedCanvasIcon).toHaveBeenCalledWith(null);
  });

  it("attaches a selected vision cone to a host icon on placement", () => {
    let abilitiesState: AbilityCanvas[] = [
      {
        id: TEMP_DRAG_ID,
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 0,
        y: 0,
        iconOnly: false,
        showOuterCircle: true,
      },
      {
        id: "old-cone",
        name: "Vision Cone 30",
        action: "vision_cone_30",
        isAlly: true,
        x: 20,
        y: 24,
        attachedToId: "agent-1",
      },
    ];

    const setAbilitiesOnCanvas = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    const setSelectedCanvasIcon = jest.fn();

    mockGetNextId.mockReturnValue("ability-new");

    mockUseCanvas.mockReturnValue(
      createCanvasContext({
        selectedCanvasIcon: {
          id: "vision_cone_60",
          name: "Vision Cone 60",
          action: "vision_cone_60",
          src: "circle.svg",
          slot: "",
        },
        setSelectedCanvasIcon,
        abilitiesOnCanvas: abilitiesState,
        setAbilitiesOnCanvas,
        agentsOnCanvas: [
          {
            id: "agent-1",
            name: "Jett",
            role: "Duelist",
            isAlly: true,
            x: 4,
            y: 8,
          },
        ],
      }),
    );

    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasEvents(stageRef, 1));

    act(() => {
      result.current.handleStageClick();
    });

    expect(setAbilitiesOnCanvas).toHaveBeenCalled();
    expect(abilitiesState).toHaveLength(1);
    expect(abilitiesState[0]).toMatchObject({
      id: "ability-new",
      x: 4,
      y: 8,
      attachedToId: "agent-1",
    });
    expect(setSelectedCanvasIcon).toHaveBeenCalledWith(null);
  });

  it("does not attach a hidden-shape vision cone to a host icon on placement", () => {
    let abilitiesState: AbilityCanvas[] = [
      {
        id: TEMP_DRAG_ID,
        name: "Vision Cone 60",
        action: "vision_cone_60",
        isAlly: true,
        x: 0,
        y: 0,
        iconOnly: true,
        showOuterCircle: true,
      },
      {
        id: "old-cone",
        name: "Vision Cone 30",
        action: "vision_cone_30",
        isAlly: true,
        x: 20,
        y: 24,
        attachedToId: "agent-1",
      },
    ];

    const setAbilitiesOnCanvas = jest.fn((updater) => {
      abilitiesState =
        typeof updater === "function" ? updater(abilitiesState) : updater;
    });

    const setSelectedCanvasIcon = jest.fn();

    mockGetNextId.mockReturnValue("ability-new");

    mockUseCanvas.mockReturnValue(
      createCanvasContext({
        selectedCanvasIcon: {
          id: "vision_cone_60",
          name: "Vision Cone 60",
          action: "vision_cone_60",
          src: "circle.svg",
          slot: "",
        },
        setSelectedCanvasIcon,
        abilitiesOnCanvas: abilitiesState,
        setAbilitiesOnCanvas,
        agentsOnCanvas: [
          {
            id: "agent-1",
            name: "Jett",
            role: "Duelist",
            isAlly: true,
            x: 4,
            y: 8,
          },
        ],
      }),
    );

    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasEvents(stageRef, 1));

    act(() => {
      result.current.handleStageClick();
    });

    expect(setAbilitiesOnCanvas).toHaveBeenCalled();
    expect(abilitiesState).toHaveLength(2);
    expect(abilitiesState[0]).toMatchObject({
      id: "ability-new",
      x: 4,
      y: 8,
      iconOnly: true,
      attachedToId: undefined,
    });
    expect(abilitiesState[1]).toMatchObject({
      id: "old-cone",
      attachedToId: "agent-1",
    });
    expect(setSelectedCanvasIcon).toHaveBeenCalledWith(null);
  });

  it("does not clear editing state when clicking stage while editing text", () => {
    const setEditingTextId = jest.fn();

    mockUseCanvas.mockReturnValue(
      createCanvasContext({
        editingTextId: "text-123",
        setEditingTextId,
      }),
    );

    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasEvents(stageRef, 1));

    act(() => {
      result.current.handleStageClick();
    });

    expect(setEditingTextId).not.toHaveBeenCalled();
    expect(handleDrawingMock).not.toHaveBeenCalled();
  });

  it("handles stage pointer up by ending drawing state", () => {
    mockUseCanvas.mockReturnValue(createCanvasContext());

    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasEvents(stageRef, 1));

    act(() => {
      result.current.handleStagePointerUp();
    });

    expect(handleMouseUpMock).toHaveBeenCalledTimes(1);
  });

  it("removes the temp drag icon when leaving the stage", () => {
    let agentsState: AgentCanvas[] = [
      {
        id: TEMP_DRAG_ID,
        name: "Sova",
        role: "Initiator",
        isAlly: false,
        x: 1,
        y: 1,
      },
    ];

    const setAgentsOnCanvas = jest.fn((updater) => {
      agentsState =
        typeof updater === "function" ? updater(agentsState) : updater;
    });

    const setSelectedCanvasIcon = jest.fn();

    mockUseCanvas.mockReturnValue(
      createCanvasContext({
        selectedCanvasIcon: { name: "Sova", role: "Initiator" },
        setSelectedCanvasIcon,
        agentsOnCanvas: agentsState,
        setAgentsOnCanvas,
      }),
    );

    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const { result } = renderHook(() => useCanvasEvents(stageRef, 1));

    act(() => {
      result.current.handleStageMouseLeave();
    });

    expect(handleMouseUpMock).toHaveBeenCalledTimes(1);
    expect(agentsState).toEqual([]);
    expect(setSelectedCanvasIcon).toHaveBeenCalledWith(null);
  });

  it("places sidebar drag icon when pointer is released over stage bounds", () => {
    let agentsState: AgentCanvas[] = [
      {
        id: TEMP_DRAG_ID,
        name: "Jett",
        role: "Duelist",
        isAlly: true,
        x: 0,
        y: 0,
      },
    ];

    const setAgentsOnCanvas = jest.fn((updater) => {
      agentsState =
        typeof updater === "function" ? updater(agentsState) : updater;
    });
    const setSelectedCanvasIcon = jest.fn();
    const setIsSidebarDragActive = jest.fn();

    const stage = createStageMock({
      container: jest.fn(() => ({
        contains: jest.fn(() => false),
        getBoundingClientRect: jest.fn(
          () =>
            ({
              left: 0,
              top: 0,
              right: 300,
              bottom: 300,
              width: 300,
              height: 300,
              x: 0,
              y: 0,
              toJSON: () => ({}),
            }) as DOMRect,
        ),
        style: {},
      })),
    });

    mockUseCanvas.mockReturnValue(
      createCanvasContext({
        selectedCanvasIcon: { name: "Jett", role: "Duelist" },
        setSelectedCanvasIcon,
        isSidebarDragActive: true,
        setIsSidebarDragActive,
        agentsOnCanvas: agentsState,
        setAgentsOnCanvas,
      }),
    );

    const stageRef = {
      current: stage as unknown as Stage,
    };

    renderHook(() => useCanvasEvents(stageRef, 1));

    act(() => {
      const PointerUpEvent = window.PointerEvent ?? MouseEvent;
      window.dispatchEvent(
        new PointerUpEvent("pointerup", { clientX: 100, clientY: 100 }),
      );
    });

    expect(setAgentsOnCanvas).toHaveBeenCalled();
    expect(agentsState[0]).toMatchObject({
      id: "agent-new",
      x: 4,
      y: 8,
    });
    expect(setSelectedCanvasIcon).toHaveBeenCalledWith(null);
    expect(setIsSidebarDragActive).toHaveBeenCalledWith(false);
  });
});
