import { act, renderHook, waitFor } from "@testing-library/react";
import { useCanvasState } from "@/hooks/canvas/use-canvas-state";
import { useLobby } from "@/hooks/api/use-lobby";
import {
  useCanvasItems,
  useCanvasUI,
  useHistoryManager,
  usePhaseManager,
  usePhaseTransitions,
} from "@/hooks/canvas";
import { useCanvasPatch } from "@/hooks/canvas/use-canvas-patch";
import { useSettings } from "@/contexts/settings-context";
import { useParams } from "next/navigation";
import type { UndoableState } from "@/lib/types";

jest.mock("@/hooks/api/use-lobby", () => ({
  useLobby: jest.fn(),
}));

jest.mock("@/hooks/canvas", () => ({
  useCanvasItems: jest.fn(),
  useCanvasUI: jest.fn(),
  useHistoryManager: jest.fn(),
  usePhaseManager: jest.fn(),
  usePhaseTransitions: jest.fn(),
}));

jest.mock("@/hooks/canvas/use-canvas-patch", () => ({
  useCanvasPatch: jest.fn(),
}));

jest.mock("@/contexts/settings-context", () => ({
  useSettings: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

const mockUseLobby = jest.mocked(useLobby);
const mockUseCanvasItems = jest.mocked(useCanvasItems);
const mockUseCanvasUI = jest.mocked(useCanvasUI);
const mockUseHistoryManager = jest.mocked(useHistoryManager);
const mockUsePhaseManager = jest.mocked(usePhaseManager);
const mockUsePhaseTransitions = jest.mocked(usePhaseTransitions);
const mockUseCanvasPatch = jest.mocked(useCanvasPatch);
const mockUseSettings = jest.mocked(useSettings);
const mockUseParams = jest.mocked(useParams);

const createEmptyPhases = () =>
  Array.from({ length: 10 }, () => ({
    agentsOnCanvas: [],
    abilitiesOnCanvas: [],
    drawLines: [],
    connectingLines: [],
    textsOnCanvas: [],
    imagesOnCanvas: [],
    toolIconsOnCanvas: [],
  }));

describe("useCanvasState", () => {
  const baseMap = { id: "ascent", text: "Ascent", textColor: "text-white" };
  const baseSettings = {
    scale: 1,
    borderOpacity: 1,
    borderWidth: 2,
    radius: 20,
    allyColor: "#00ff00",
    enemyColor: "#ff0000",
  };
  let updateAgentsSettingsMock: jest.Mock;
  let updateAbilitiesSettingsMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    updateAgentsSettingsMock = jest.fn();
    updateAbilitiesSettingsMock = jest.fn();

    mockUseParams.mockReturnValue({ lobbyCode: "ABCD" });

    const phases = createEmptyPhases();

    mockUsePhaseManager.mockReturnValue({
      currentPhase: phases[0],
      currentPhaseIndex: 0,
      editedPhases: new Set<number>(),
      phases,
      getLatestPhases: jest.fn(() => phases),
      updateCurrentPhase: jest.fn(),
      switchToPhase: jest.fn(),
      duplicatePhase: jest.fn(),
      deletePhase: jest.fn(),
      setCurrentPhaseIndex: jest.fn(),
      setPhases: jest.fn(),
      setEditedPhases: jest.fn(),
      resetAllPhases: jest.fn(),
    } as never);

    mockUseCanvasItems.mockReturnValue({
      agentsOnCanvas: [],
      setAgentsOnCanvas: jest.fn(),
      abilitiesOnCanvas: [],
      setAbilitiesOnCanvas: jest.fn(),
      drawLines: [],
      setDrawLines: jest.fn(),
      connectingLines: [],
      setConnectingLines: jest.fn(),
      textsOnCanvas: [],
      setTextsOnCanvas: jest.fn(),
      imagesOnCanvas: [],
      setImagesOnCanvas: jest.fn(),
      toolIconsOnCanvas: [],
      setToolIconsOnCanvas: jest.fn(),
    } as never);

    mockUseCanvasUI.mockReturnValue({
      selectedMap: baseMap,
      setSelectedMap: jest.fn(),
      mapSide: "attack",
      setMapSide: jest.fn(),
      resetEdits: jest.fn(),
      tool: "pencil",
      setTool: jest.fn(),
      currentStroke: null,
      setCurrentStroke: jest.fn(),
      isDrawMode: false,
      setIsDrawMode: jest.fn(),
      isDrawing: { current: false },
      isDeleteSettingsOpen: false,
      setIsDeleteSettingsOpen: jest.fn(),
      editingTextId: null,
      setEditingTextId: jest.fn(),
      selectedCanvasIcon: null,
      setSelectedCanvasIcon: jest.fn(),
      isSidebarDragActive: false,
      setIsSidebarDragActive: jest.fn(),
      currentStageScale: 1,
      setCurrentStageScale: jest.fn(),
      isAlly: true,
      setIsAlly: jest.fn(),
      showCallouts: false,
      setShowCallouts: jest.fn(),
      showUltOrbs: false,
      setShowUltOrbs: jest.fn(),
      showSpawnBarriers: false,
      setShowSpawnBarriers: jest.fn(),
    } as never);

    mockUsePhaseTransitions.mockReturnValue({
      transitionToPhase: jest.fn(),
      registerNode: jest.fn(),
      unregisterNode: jest.fn(),
      getRegisteredNode: jest.fn(),
      isTransitioning: { current: false },
    } as never);

    mockUseSettings.mockReturnValue({
      agentsSettings: baseSettings,
      abilitiesSettings: baseSettings,
      updateAgentsSettings: updateAgentsSettingsMock,
      updateAbilitiesSettings: updateAbilitiesSettingsMock,
    } as never);

    mockUseCanvasPatch.mockReturnValue({
      enqueueCanvasPatchEntry: jest.fn(),
    } as never);

    mockUseHistoryManager.mockReturnValue({
      history: [],
      undo: jest.fn(),
      redo: jest.fn(),
      canUndo: false,
      canRedo: false,
      saveToHistory: jest.fn(),
      resetHistory: jest.fn(),
    } as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resets undo history when hydrating a newly loaded lobby", async () => {
    const lobbyState: UndoableState = {
      phases: createEmptyPhases(),
      selectedMap: baseMap,
      mapSide: "defense",
      currentPhaseIndex: 2,
      editedPhases: [2],
      agentsSettings: baseSettings,
      abilitiesSettings: baseSettings,
    };

    mockUseLobby.mockReturnValue({
      data: {
        lobbyCode: "ABCD",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        canvasState: lobbyState,
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useCanvasState());

    expect(mockUseHistoryManager).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ isTrackingEnabled: false }),
    );

    await waitFor(() => {
      expect(result.current.resetHistory).toHaveBeenCalledTimes(2);
    });

    expect(result.current.resetHistory).toHaveBeenLastCalledWith(
      expect.objectContaining({
        agentsSettings: baseSettings,
        abilitiesSettings: baseSettings,
      }),
    );
    expect(mockUseHistoryManager).toHaveBeenLastCalledWith(
      expect.objectContaining({ isTrackingEnabled: true }),
    );

    const phaseManager = mockUsePhaseManager.mock.results[0]?.value as {
      setPhases: jest.Mock;
      setCurrentPhaseIndex: jest.Mock;
      setEditedPhases: jest.Mock;
    };
    const canvasUI = mockUseCanvasUI.mock.results[0]?.value as {
      setSelectedMap: jest.Mock;
      setMapSide: jest.Mock;
    };

    expect(phaseManager.setPhases).toHaveBeenCalledWith(lobbyState.phases);
    expect(phaseManager.setCurrentPhaseIndex).toHaveBeenCalledWith(2);
    expect(canvasUI.setSelectedMap).toHaveBeenCalledWith(baseMap);
    expect(canvasUI.setMapSide).toHaveBeenCalledWith("defense");
  });

  it("normalizes missing settings before seeding lobby history", async () => {
    const lobbyState: UndoableState = {
      phases: createEmptyPhases(),
      selectedMap: baseMap,
      mapSide: "attack",
      currentPhaseIndex: 0,
      editedPhases: [0],
    };

    mockUseLobby.mockReturnValue({
      data: {
        lobbyCode: "ABCD",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        canvasState: lobbyState,
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useCanvasState());

    await waitFor(() => {
      expect(result.current.resetHistory).toHaveBeenCalledTimes(2);
    });

    expect(result.current.resetHistory).toHaveBeenLastCalledWith(
      expect.objectContaining({
        agentsSettings: baseSettings,
        abilitiesSettings: baseSettings,
      }),
    );
  });

  it("seeds hydrated history with loaded settings after they rerender", async () => {
    let currentAgentsSettings = baseSettings;
    let currentAbilitiesSettings = baseSettings;

    mockUseSettings.mockImplementation(
      () =>
        ({
          agentsSettings: currentAgentsSettings,
          abilitiesSettings: currentAbilitiesSettings,
          updateAgentsSettings: (settings: Partial<typeof baseSettings>) => {
            currentAgentsSettings = { ...currentAgentsSettings, ...settings };
          },
          updateAbilitiesSettings: (settings: Partial<typeof baseSettings>) => {
            currentAbilitiesSettings = {
              ...currentAbilitiesSettings,
              ...settings,
            };
          },
        }) as never,
    );

    const hydratedAgentsSettings = { ...baseSettings, scale: 1.5 };
    const hydratedAbilitiesSettings = { ...baseSettings, radius: 28 };

    mockUseLobby.mockReturnValue({
      data: {
        lobbyCode: "ABCD",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        canvasState: {
          phases: createEmptyPhases(),
          selectedMap: baseMap,
          mapSide: "attack",
          currentPhaseIndex: 0,
          editedPhases: [],
          agentsSettings: hydratedAgentsSettings,
          abilitiesSettings: hydratedAbilitiesSettings,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    const { result, rerender } = renderHook(() => useCanvasState());

    act(() => {
      rerender();
    });

    await waitFor(() => {
      expect(result.current.resetHistory).toHaveBeenCalledTimes(2);
    });

    expect(result.current.resetHistory).toHaveBeenLastCalledWith(
      expect.objectContaining({
        agentsSettings: hydratedAgentsSettings,
        abilitiesSettings: hydratedAbilitiesSettings,
      }),
    );
  });

  it("hides stale undo state until the lobby history scope is ready", () => {
    const historyUndo = jest.fn();
    const historyRedo = jest.fn();
    const historySaveToHistory = jest.fn();

    mockUseHistoryManager.mockReturnValue({
      history: [
        {
          phases: createEmptyPhases(),
          selectedMap: baseMap,
          mapSide: "attack",
          currentPhaseIndex: 0,
          editedPhases: [0],
          agentsSettings: baseSettings,
          abilitiesSettings: baseSettings,
        },
      ],
      undo: historyUndo,
      redo: historyRedo,
      canUndo: true,
      canRedo: true,
      saveToHistory: historySaveToHistory,
      resetHistory: jest.fn(),
    } as never);

    mockUseLobby.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useCanvasState());

    expect(result.current.history).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
      result.current.redo();
      result.current.saveToHistory();
    });

    expect(historyUndo).not.toHaveBeenCalled();
    expect(historyRedo).not.toHaveBeenCalled();
    expect(historySaveToHistory).not.toHaveBeenCalled();
  });

  it("applies agent and ability settings when replaying history state", () => {
    mockUseLobby.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderHook(() => useCanvasState());

    const historyConfig = mockUseHistoryManager.mock.calls.at(-1)?.[0] as {
      applyState: (state: UndoableState) => void;
    };

    const nextAgentsSettings = { ...baseSettings, scale: 1.5 };
    const nextAbilitiesSettings = { ...baseSettings, radius: 28 };

    act(() => {
      historyConfig.applyState({
        phases: createEmptyPhases(),
        selectedMap: baseMap,
        mapSide: "defense",
        currentPhaseIndex: 1,
        editedPhases: [1],
        agentsSettings: nextAgentsSettings,
        abilitiesSettings: nextAbilitiesSettings,
      });
    });

    expect(updateAgentsSettingsMock).toHaveBeenCalledWith(nextAgentsSettings);
    expect(updateAbilitiesSettingsMock).toHaveBeenCalledWith(
      nextAbilitiesSettings,
    );
  });

  it("keeps history snapshots aligned with the latest map and settings after rerender", () => {
    const updatedMap = {
      id: "bind",
      text: "Bind",
      textColor: "text-amber-200",
    };
    const phases = createEmptyPhases();
    let currentPhaseIndex = 0;
    let currentEditedPhases = new Set<number>([0]);
    let currentSelectedMap = baseMap;
    let currentMapSide: "attack" | "defense" = "attack";
    let currentAgentsSettings = baseSettings;
    let currentAbilitiesSettings = baseSettings;

    mockUsePhaseManager.mockImplementation(
      () =>
        ({
          currentPhase: phases[currentPhaseIndex],
          currentPhaseIndex,
          editedPhases: currentEditedPhases,
          phases,
          getLatestPhases: jest.fn(() => phases),
          updateCurrentPhase: jest.fn(),
          switchToPhase: jest.fn(),
          duplicatePhase: jest.fn(),
          deletePhase: jest.fn(),
          setCurrentPhaseIndex: jest.fn(),
          setPhases: jest.fn(),
          setEditedPhases: jest.fn(),
          resetAllPhases: jest.fn(),
        }) as never,
    );

    mockUseCanvasUI.mockImplementation(
      () =>
        ({
          selectedMap: currentSelectedMap,
          setSelectedMap: jest.fn(),
          mapSide: currentMapSide,
          setMapSide: jest.fn(),
          resetEdits: jest.fn(),
          tool: "pencil",
          setTool: jest.fn(),
          currentStroke: null,
          setCurrentStroke: jest.fn(),
          isDrawMode: false,
          setIsDrawMode: jest.fn(),
          isDrawing: { current: false },
          isDeleteSettingsOpen: false,
          setIsDeleteSettingsOpen: jest.fn(),
          editingTextId: null,
          setEditingTextId: jest.fn(),
          selectedCanvasIcon: null,
          setSelectedCanvasIcon: jest.fn(),
          isSidebarDragActive: false,
          setIsSidebarDragActive: jest.fn(),
          currentStageScale: 1,
          setCurrentStageScale: jest.fn(),
          isAlly: true,
          setIsAlly: jest.fn(),
          showCallouts: false,
          setShowCallouts: jest.fn(),
          showUltOrbs: false,
          setShowUltOrbs: jest.fn(),
          showSpawnBarriers: false,
          setShowSpawnBarriers: jest.fn(),
        }) as never,
    );

    mockUseSettings.mockImplementation(
      () =>
        ({
          agentsSettings: currentAgentsSettings,
          abilitiesSettings: currentAbilitiesSettings,
          updateAgentsSettings: jest.fn(),
          updateAbilitiesSettings: jest.fn(),
        }) as never,
    );

    mockUseLobby.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { rerender } = renderHook(() => useCanvasState());

    const initialHistoryConfig = mockUseHistoryManager.mock.calls.at(
      -1,
    )?.[0] as {
      getCurrentState: () => UndoableState;
    };

    currentPhaseIndex = 2;
    currentEditedPhases = new Set<number>([0, 2]);
    currentSelectedMap = updatedMap;
    currentMapSide = "defense";
    currentAgentsSettings = { ...baseSettings, scale: 1.5 };
    currentAbilitiesSettings = { ...baseSettings, radius: 28 };

    act(() => {
      rerender();
    });

    const latestHistoryConfig = mockUseHistoryManager.mock.calls.at(
      -1,
    )?.[0] as {
      getCurrentState: () => UndoableState;
    };

    expect(latestHistoryConfig.getCurrentState).not.toBe(
      initialHistoryConfig.getCurrentState,
    );

    expect(initialHistoryConfig.getCurrentState()).toEqual(
      expect.objectContaining({
        selectedMap: updatedMap,
        mapSide: "defense",
        currentPhaseIndex: 2,
        editedPhases: [0, 2],
        agentsSettings: { ...baseSettings, scale: 1.5 },
        abilitiesSettings: { ...baseSettings, radius: 28 },
      }),
    );

    expect(latestHistoryConfig.getCurrentState()).toEqual(
      expect.objectContaining({
        selectedMap: updatedMap,
        mapSide: "defense",
        currentPhaseIndex: 2,
        editedPhases: [0, 2],
        agentsSettings: { ...baseSettings, scale: 1.5 },
        abilitiesSettings: { ...baseSettings, radius: 28 },
      }),
    );
  });

  it("resets undo history immediately when navigating to a different lobby", async () => {
    const params = { lobbyCode: "ABCD" };
    mockUseParams.mockImplementation(() => params);
    mockUseLobby.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { result, rerender } = renderHook(() => useCanvasState());

    await waitFor(() => {
      expect(result.current.resetHistory).toHaveBeenCalledTimes(1);
    });

    (result.current.resetHistory as jest.Mock).mockClear();

    params.lobbyCode = "WXYZ";
    rerender();

    await waitFor(() => {
      expect(result.current.resetHistory).toHaveBeenCalledTimes(1);
    });
  });
});
