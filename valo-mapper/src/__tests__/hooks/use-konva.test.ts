import { renderHook, act } from "@testing-library/react";
import { useKonva } from "@/hooks/use-konva";
import { TEMP_DRAG_ID } from "@/lib/consts";
import type { AgentCanvas } from "@/lib/types";
import type { Stage } from "konva/lib/Stage";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useCanvasZoom } from "@/hooks/canvas/use-canvas-zoom";
import { useCanvasDrawing } from "@/hooks/canvas/use-canvas-drawing";
import { useCanvasContextMenu } from "@/hooks/canvas/use-canvas-context-menu";
import { getNextId } from "@/lib/utils";

type StageMock = {
  getPointerPosition: jest.Mock<{ x: number; y: number } | undefined, []>;
  position: jest.Mock<{ x: number; y: number }>;
  scaleX: jest.Mock<number>;
  findOne: jest.Mock<{ position: jest.Mock } | null, [string?]>;
  draggable: jest.Mock;
  isDragging: jest.Mock<boolean>;
};

jest.mock("@/contexts/canvas-context", () => ({
  useCanvas: jest.fn(),
}));

jest.mock("@/contexts/settings-context", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/hooks/canvas/use-canvas-zoom", () => ({
  useCanvasZoom: jest.fn(),
}));

jest.mock("@/hooks/canvas/use-canvas-drawing", () => ({
  useCanvasDrawing: jest.fn(),
}));

jest.mock("@/hooks/canvas/use-canvas-context-menu", () => ({
  useCanvasContextMenu: jest.fn(),
}));

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
  draggable: jest.fn(),
  isDragging: jest.fn(() => false),
  ...overrides,
});

const createCanvasContext = (
  overrides: Partial<ReturnType<typeof mockUseCanvas>> = {}
) =>
  ({
    selectedCanvasIcon: null,
    setSelectedCanvasIcon: jest.fn(),
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
    saveCanvasState: jest.fn(),
    hasUnsavedChanges: false,
    isUpdatingLobby: false,
    isErrorUpdatingLobby: false,
    isLoadingLobby: false,
    isErrorLobby: false,
    lobbyError: null,
    hoveredElementId: null,
    setHoveredElementId: jest.fn(),
    recenterCanvasCallback: { current: null },
    ...overrides,
  } as unknown as ReturnType<typeof useCanvas>);

describe("useKonva", () => {
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
      closeContextMenu: jest.fn(),
    });
  });

  it("starts drawing when clicking the stage in draw mode", () => {
    mockUseCanvas.mockReturnValue(
      createCanvasContext({
        isDrawMode: true,
      })
    );

    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const { result } = renderHook(() => useKonva(stageRef, 1));

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
      })
    );

    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const { result } = renderHook(() => useKonva(stageRef, 1));

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
      })
    );

    const stageRef = {
      current: createStageMock() as unknown as Stage,
    };

    const { result } = renderHook(() => useKonva(stageRef, 1));

    act(() => {
      result.current.handleStageMouseLeave();
    });

    expect(handleMouseUpMock).toHaveBeenCalledTimes(1);
    expect(agentsState).toEqual([]);
    expect(setSelectedCanvasIcon).toHaveBeenCalledWith(null);
  });
});
