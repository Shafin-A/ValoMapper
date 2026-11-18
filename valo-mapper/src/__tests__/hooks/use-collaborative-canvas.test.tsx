import { act, renderHook } from "@testing-library/react";
import { ReactNode } from "react";
import { useCanvasActions, useCanvasPhase } from "@/contexts/canvas-context";
import { useWebSocket } from "@/contexts/websocket-context";
import type {
  AbilityCanvas,
  AgentCanvas,
  ConnectingLine,
  DrawLine,
  ImageCanvas,
  MapOption,
  PhaseState,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";

jest.mock("@/contexts/canvas-context", () => ({
  useCanvasActions: jest.fn(),
  useCanvasPhase: jest.fn(),
}));

jest.mock("@/contexts/websocket-context", () => ({
  useWebSocket: jest.fn(),
}));

const collaborativeCanvasModule = jest.requireActual<
  typeof import("@/hooks/use-collaborative-canvas")
>("@/hooks/use-collaborative-canvas");

const { CollaborativeCanvasProvider, useCollaborativeCanvas } =
  collaborativeCanvasModule;

const mockUseCanvasPhase = jest.mocked(useCanvasPhase);
const mockUseCanvasActions = jest.mocked(useCanvasActions);
const mockUseWebSocket = jest.mocked(useWebSocket);

type CollaborativeCanvas = ReturnType<typeof useCollaborativeCanvas>;

const emptyPhase = (): PhaseState => ({
  agentsOnCanvas: [],
  abilitiesOnCanvas: [],
  drawLines: [],
  connectingLines: [],
  textsOnCanvas: [],
  imagesOnCanvas: [],
  toolIconsOnCanvas: [],
});

const agent: AgentCanvas = {
  id: "agent-1",
  name: "Astra",
  isAlly: true,
  role: "Controller",
  x: 10,
  y: 20,
};

const ability: AbilityCanvas = {
  id: "ability-1",
  name: "Nova Pulse",
  isAlly: true,
  action: "astra_stun",
  x: 30,
  y: 40,
};

const connectingLine: ConnectingLine = {
  id: "conn-1",
  fromId: "agent-1",
  toId: "agent-2",
  strokeColor: "#42EEC7",
  strokeWidth: 2,
};

const text: TextCanvas = {
  id: "text-1",
  text: "Rotate",
  x: 50,
  y: 60,
  width: 120,
  height: 30,
};

const image: ImageCanvas = {
  id: "image-1",
  src: "/image.png",
  x: 70,
  y: 80,
  width: 100,
  height: 100,
};

const toolIcon: ToolIconCanvas = {
  id: "tool-1",
  name: "Spike",
  x: 90,
  y: 100,
  width: 24,
  height: 24,
};

const drawLine = (pointCount: number, id = "line-1"): DrawLine => ({
  id,
  tool: "pencil",
  points: Array.from({ length: pointCount }, (_, index) => ({
    x: index,
    y: index,
  })),
  color: "#ffffff",
  size: 2,
  isDashed: false,
  isArrowHead: false,
});

type WebSocketMock = {
  status: string;
  broadcastAgentAdded: jest.Mock;
  broadcastAgentMoved: jest.Mock;
  broadcastAgentRemoved: jest.Mock;
  broadcastAbilityAdded: jest.Mock;
  broadcastAbilityMoved: jest.Mock;
  broadcastAbilityRemoved: jest.Mock;
  broadcastLineDrawn: jest.Mock;
  broadcastLineRemoved: jest.Mock;
  broadcastConnLineAdded: jest.Mock;
  broadcastConnLineUpdated: jest.Mock;
  broadcastConnLineRemoved: jest.Mock;
  broadcastTextAdded: jest.Mock;
  broadcastTextUpdated: jest.Mock;
  broadcastTextRemoved: jest.Mock;
  broadcastImageAdded: jest.Mock;
  broadcastImageMoved: jest.Mock;
  broadcastImageUpdated: jest.Mock;
  broadcastImageRemoved: jest.Mock;
  broadcastStateSync: jest.Mock;
  broadcastToolIconAdded: jest.Mock;
  broadcastToolIconMoved: jest.Mock;
  broadcastToolIconRemoved: jest.Mock;
  broadcastMapChanged: jest.Mock;
  broadcastSideChanged: jest.Mock;
  broadcastPhaseChanged: jest.Mock;
  broadcastSettingsChanged: jest.Mock;
};

const createWebSocket = (status = "connected"): WebSocketMock => ({
  status,
  broadcastAgentAdded: jest.fn(),
  broadcastAgentMoved: jest.fn(),
  broadcastAgentRemoved: jest.fn(),
  broadcastAbilityAdded: jest.fn(),
  broadcastAbilityMoved: jest.fn(),
  broadcastAbilityRemoved: jest.fn(),
  broadcastLineDrawn: jest.fn(),
  broadcastLineRemoved: jest.fn(),
  broadcastConnLineAdded: jest.fn(),
  broadcastConnLineUpdated: jest.fn(),
  broadcastConnLineRemoved: jest.fn(),
  broadcastTextAdded: jest.fn(),
  broadcastTextUpdated: jest.fn(),
  broadcastTextRemoved: jest.fn(),
  broadcastImageAdded: jest.fn(),
  broadcastImageMoved: jest.fn(),
  broadcastImageUpdated: jest.fn(),
  broadcastImageRemoved: jest.fn(),
  broadcastStateSync: jest.fn(),
  broadcastToolIconAdded: jest.fn(),
  broadcastToolIconMoved: jest.fn(),
  broadcastToolIconRemoved: jest.fn(),
  broadcastMapChanged: jest.fn(),
  broadcastSideChanged: jest.fn(),
  broadcastPhaseChanged: jest.fn(),
  broadcastSettingsChanged: jest.fn(),
});

type ActionsMock = {
  agentsSettings: {
    scale: number;
    borderOpacity: number;
    borderWidth: number;
    radius: number;
    allyColor: string;
    enemyColor: string;
  };
  abilitiesSettings: {
    scale: number;
    borderOpacity: number;
    borderWidth: number;
    radius: number;
    allyColor: string;
    enemyColor: string;
  };
  updateAgentsSettings: jest.Mock;
  updateAbilitiesSettings: jest.Mock;
  getLatestPhases: jest.Mock;
  enqueueCanvasPatchEntry: jest.Mock;
  flushCanvasPatch: jest.Mock;
};

const createActions = (phases: PhaseState[] = []): ActionsMock => {
  const settings = {
    scale: 1,
    borderOpacity: 0.5,
    borderWidth: 2,
    radius: 4,
    allyColor: "#42EEC7",
    enemyColor: "#FF4655",
  };

  return {
    agentsSettings: { ...settings },
    abilitiesSettings: { ...settings },
    updateAgentsSettings: jest.fn(),
    updateAbilitiesSettings: jest.fn(),
    getLatestPhases: jest.fn(() => phases),
    enqueueCanvasPatchEntry: jest.fn(),
    flushCanvasPatch: jest.fn().mockResolvedValue(undefined),
  };
};

const setup = ({
  status = "connected",
  currentPhaseIndex = 2,
  editedPhases = new Set([currentPhaseIndex]),
  phases = [],
}: {
  status?: string;
  currentPhaseIndex?: number;
  editedPhases?: Set<number>;
  phases?: PhaseState[];
} = {}) => {
  const webSocket = createWebSocket(status);
  const actions = createActions(phases);

  mockUseWebSocket.mockReturnValue(
    webSocket as unknown as ReturnType<typeof useWebSocket>,
  );
  mockUseCanvasPhase.mockReturnValue({
    currentPhaseIndex,
    editedPhases,
  } as unknown as ReturnType<typeof useCanvasPhase>);
  mockUseCanvasActions.mockReturnValue(
    actions as unknown as ReturnType<typeof useCanvasActions>,
  );

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <CollaborativeCanvasProvider>{children}</CollaborativeCanvasProvider>
  );
  Wrapper.displayName = "CollaborativeCanvasTestWrapper";

  const { result, rerender } = renderHook(() => useCollaborativeCanvas(), {
    wrapper: Wrapper,
  });

  return { result, rerender, webSocket, actions };
};

type EntityCase = {
  entity: string;
  item: unknown;
  id: string;
  add: (canvas: CollaborativeCanvas) => void;
  update: (canvas: CollaborativeCanvas) => void;
  remove: (canvas: CollaborativeCanvas) => void;
  broadcastAdd: keyof WebSocketMock;
  broadcastUpdate: keyof WebSocketMock;
  broadcastRemove: keyof WebSocketMock;
};

const entityCases: EntityCase[] = [
  {
    entity: "agent",
    item: agent,
    id: agent.id,
    add: (canvas) => canvas.notifyAgentAdded(agent),
    update: (canvas) => canvas.notifyAgentMoved(agent),
    remove: (canvas) => canvas.notifyAgentRemoved(agent.id),
    broadcastAdd: "broadcastAgentAdded",
    broadcastUpdate: "broadcastAgentMoved",
    broadcastRemove: "broadcastAgentRemoved",
  },
  {
    entity: "ability",
    item: ability,
    id: ability.id,
    add: (canvas) => canvas.notifyAbilityAdded(ability),
    update: (canvas) => canvas.notifyAbilityMoved(ability),
    remove: (canvas) => canvas.notifyAbilityRemoved(ability.id),
    broadcastAdd: "broadcastAbilityAdded",
    broadcastUpdate: "broadcastAbilityMoved",
    broadcastRemove: "broadcastAbilityRemoved",
  },
  {
    entity: "connectingline",
    item: connectingLine,
    id: connectingLine.id,
    add: (canvas) => canvas.notifyConnLineAdded(connectingLine),
    update: (canvas) => canvas.notifyConnLineUpdated(connectingLine),
    remove: (canvas) => canvas.notifyConnLineRemoved(connectingLine.id),
    broadcastAdd: "broadcastConnLineAdded",
    broadcastUpdate: "broadcastConnLineUpdated",
    broadcastRemove: "broadcastConnLineRemoved",
  },
  {
    entity: "text",
    item: text,
    id: text.id,
    add: (canvas) => canvas.notifyTextAdded(text),
    update: (canvas) => canvas.notifyTextUpdated(text),
    remove: (canvas) => canvas.notifyTextRemoved(text.id),
    broadcastAdd: "broadcastTextAdded",
    broadcastUpdate: "broadcastTextUpdated",
    broadcastRemove: "broadcastTextRemoved",
  },
  {
    entity: "image",
    item: image,
    id: image.id,
    add: (canvas) => canvas.notifyImageAdded(image),
    update: (canvas) => canvas.notifyImageUpdated(image),
    remove: (canvas) => canvas.notifyImageRemoved(image.id),
    broadcastAdd: "broadcastImageAdded",
    broadcastUpdate: "broadcastImageUpdated",
    broadcastRemove: "broadcastImageRemoved",
  },
  {
    entity: "toolicon",
    item: toolIcon,
    id: toolIcon.id,
    add: (canvas) => canvas.notifyToolIconAdded(toolIcon),
    update: (canvas) => canvas.notifyToolIconMoved(toolIcon),
    remove: (canvas) => canvas.notifyToolIconRemoved(toolIcon.id),
    broadcastAdd: "broadcastToolIconAdded",
    broadcastUpdate: "broadcastToolIconMoved",
    broadcastRemove: "broadcastToolIconRemoved",
  },
];

describe("useCollaborativeCanvas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires the provider", () => {
    expect(() => renderHook(() => useCollaborativeCanvas())).toThrow(
      "useCollaborativeCanvas must be used within a CollaborativeCanvasProvider",
    );
  });

  it("exposes the connection state", () => {
    const { result } = setup({ status: "disconnected" });

    expect(result.current.isConnected).toBe(false);
  });

  it.each(entityCases)(
    "enqueues and broadcasts $entity lifecycle changes",
    ({ entity, item, id, add, update, remove, ...broadcasts }) => {
      const { result, webSocket, actions } = setup();

      add(result.current);
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith({
        entity,
        action: "add",
        phaseIndex: 2,
        id,
        payload: item,
      });
      expect(webSocket[broadcasts.broadcastAdd]).toHaveBeenCalledWith(item, 2);

      actions.enqueueCanvasPatchEntry.mockClear();
      update(result.current);
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith({
        entity,
        action: "update",
        phaseIndex: 2,
        id,
        payload: item,
      });
      expect(webSocket[broadcasts.broadcastUpdate]).toHaveBeenCalledWith(
        item,
        2,
      );

      actions.enqueueCanvasPatchEntry.mockClear();
      remove(result.current);
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith({
        entity,
        action: "remove",
        phaseIndex: 2,
        id,
      });
      expect(webSocket[broadcasts.broadcastRemove]).toHaveBeenCalledWith(id, 2);
    },
  );

  it("does not broadcast entity changes while disconnected", () => {
    const { result, webSocket, actions } = setup({ status: "disconnected" });

    result.current.notifyAgentAdded(agent);

    expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith({
      entity: "agent",
      action: "add",
      phaseIndex: 2,
      id: agent.id,
      payload: agent,
    });
    expect(webSocket.broadcastAgentAdded).not.toHaveBeenCalled();
  });

  it("broadcasts image position moves", () => {
    const { result, webSocket } = setup();

    result.current.notifyImageMoved(image);

    expect(webSocket.broadcastImageMoved).toHaveBeenCalledWith(image, 2);
  });

  describe("draw line chunking", () => {
    it("enqueues a short line as a single entry", () => {
      const { result, webSocket, actions } = setup();
      const line = drawLine(3);

      result.current.notifyLineDrawn(line);

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledTimes(1);
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith({
        entity: "drawline",
        action: "add",
        phaseIndex: 2,
        id: line.id,
        payload: line,
      });
      expect(webSocket.broadcastLineDrawn).toHaveBeenCalledWith(line, 2);
    });

    it("splits long lines into overlapping chunks", () => {
      const { result, webSocket, actions } = setup();
      const line = drawLine(3001);

      result.current.notifyLineDrawn(line);

      const payloads = actions.enqueueCanvasPatchEntry.mock.calls.map(
        ([entry]) => entry.payload as DrawLine,
      );

      expect(payloads).toHaveLength(3);
      expect(payloads.map((chunk) => chunk.id)).toEqual([
        "line-1-chunk-0",
        "line-1-chunk-1",
        "line-1-chunk-2",
      ]);
      expect(payloads.map((chunk) => chunk.points.length)).toEqual([
        1500, 1501, 2,
      ]);
      expect(payloads.map((chunk) => chunk.parentId)).toEqual([
        "line-1",
        "line-1",
        "line-1",
      ]);
      expect(payloads.map((chunk) => chunk.chunkIndex)).toEqual([0, 1, 2]);
      expect(payloads.map((chunk) => chunk.totalChunks)).toEqual([3, 3, 3]);
      // Each chunk keeps the last point of the previous chunk for continuity.
      expect(payloads[1].points[0]).toEqual(line.points[1499]);
      expect(payloads[2].points[0]).toEqual(line.points[2999]);
      expect(webSocket.broadcastLineDrawn).toHaveBeenCalledTimes(3);
    });

    it("removes parent and chunk ids when a chunk is deleted", () => {
      const { result, webSocket, actions } = setup();

      result.current.notifyLineDrawn(drawLine(3001));
      actions.enqueueCanvasPatchEntry.mockClear();
      webSocket.broadcastLineRemoved.mockClear();

      result.current.notifyLineRemoved("line-1-chunk-1");

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledTimes(4);
      expect(
        actions.enqueueCanvasPatchEntry.mock.calls.map(([entry]) => entry.id),
      ).toEqual([
        "line-1",
        "line-1-chunk-0",
        "line-1-chunk-1",
        "line-1-chunk-2",
      ]);
      expect(webSocket.broadcastLineRemoved).toHaveBeenCalledTimes(4);

      // Once removed, the chunk registry is cleared.
      actions.enqueueCanvasPatchEntry.mockClear();
      result.current.notifyLineRemoved("line-1");

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledTimes(1);
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith({
        entity: "drawline",
        action: "remove",
        phaseIndex: 2,
        id: "line-1",
      });
    });

    it("removes unknown short-line ids directly", () => {
      const { result, actions } = setup();

      result.current.notifyLineRemoved("missing-line");

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledTimes(1);
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith({
        entity: "drawline",
        action: "remove",
        phaseIndex: 2,
        id: "missing-line",
      });
    });

    it("does not broadcast chunks while disconnected", () => {
      const { result, webSocket, actions } = setup({ status: "disconnected" });

      result.current.notifyLineDrawn(drawLine(3001));

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledTimes(3);
      expect(webSocket.broadcastLineDrawn).not.toHaveBeenCalled();
    });
  });

  describe("phase syncing", () => {
    it("sends a phase snapshot before the first edit", () => {
      const phase = emptyPhase();
      const { result, actions } = setup({
        currentPhaseIndex: 2,
        editedPhases: new Set(),
        phases: [emptyPhase(), emptyPhase(), phase],
      });

      result.current.notifyAgentAdded(agent);

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenNthCalledWith(1, {
        entity: "edited_phases",
        action: "update",
        phaseIndex: 2,
        payload: { editedPhases: [2] },
      });
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          entity: "agent",
          action: "add",
          id: agent.id,
        }),
      );
    });

    it("only syncs a phase once", () => {
      const { result, actions } = setup({
        currentPhaseIndex: 2,
        editedPhases: new Set(),
        phases: [emptyPhase(), emptyPhase(), emptyPhase()],
      });

      result.current.notifyAgentAdded(agent);
      actions.enqueueCanvasPatchEntry.mockClear();
      result.current.notifyAgentRemoved(agent.id);

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledTimes(1);
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "agent", action: "remove" }),
      );
    });

    it("skips snapshots for already edited phases", () => {
      const { result, actions } = setup({
        currentPhaseIndex: 2,
        editedPhases: new Set([2]),
        phases: [emptyPhase(), emptyPhase(), emptyPhase()],
      });

      result.current.notifyAgentAdded(agent);

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledTimes(1);
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "agent", action: "add" }),
      );
    });

    it("does nothing when the current phase does not exist", () => {
      const { result, actions } = setup({
        currentPhaseIndex: 5,
        editedPhases: new Set(),
        phases: [emptyPhase()],
      });

      result.current.notifyAgentAdded(agent);

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledTimes(1);
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "agent", action: "add" }),
      );
    });

    it("re-syncs a phase after it stops being edited", () => {
      const { result, rerender, actions } = setup({
        currentPhaseIndex: 2,
        editedPhases: new Set(),
        phases: [emptyPhase(), emptyPhase(), emptyPhase()],
      });

      result.current.notifyAgentAdded(agent);

      mockUseCanvasPhase.mockReturnValue({
        currentPhaseIndex: 2,
        editedPhases: new Set([2]),
      } as unknown as ReturnType<typeof useCanvasPhase>);
      rerender();

      mockUseCanvasPhase.mockReturnValue({
        currentPhaseIndex: 2,
        editedPhases: new Set(),
      } as unknown as ReturnType<typeof useCanvasPhase>);
      rerender();

      actions.enqueueCanvasPatchEntry.mockClear();
      result.current.notifyAgentAdded(agent);

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ entity: "edited_phases" }),
      );
    });
  });

  describe("full sync and canvas clearing", () => {
    it("flushes patches and broadcasts a state sync", () => {
      const { result, webSocket, actions } = setup();

      result.current.notifyFullSync();

      expect(actions.flushCanvasPatch).toHaveBeenCalledTimes(1);
      expect(webSocket.broadcastStateSync).toHaveBeenCalledTimes(1);
      expect(actions.enqueueCanvasPatchEntry).not.toHaveBeenCalled();
    });

    it("does not broadcast a full sync while disconnected", () => {
      const { result, webSocket, actions } = setup({ status: "disconnected" });

      result.current.notifyFullSync();

      expect(actions.flushCanvasPatch).toHaveBeenCalledTimes(1);
      expect(webSocket.broadcastStateSync).not.toHaveBeenCalled();
    });

    it("clears the current phase", () => {
      const { result, webSocket, actions } = setup();

      result.current.notifyCanvasClear();

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith({
        entity: "canvas",
        action: "clear",
        phaseIndex: 2,
        payload: undefined,
      });
      expect(webSocket.broadcastStateSync).toHaveBeenCalledTimes(1);
    });

    it("resets the whole canvas", () => {
      const { result, actions } = setup();

      result.current.notifyCanvasClear(true);

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith({
        entity: "canvas",
        action: "reset",
        phaseIndex: 2,
        payload: { resetAll: true },
      });
    });

    it("does not broadcast clears while disconnected", () => {
      const { result, webSocket } = setup({ status: "disconnected" });

      result.current.notifyCanvasClear();

      expect(webSocket.broadcastStateSync).not.toHaveBeenCalled();
    });
  });

  describe("phase changes", () => {
    it("enqueues phase and edited-phase updates", () => {
      const { result, webSocket, actions } = setup({
        editedPhases: new Set([0, 2]),
      });

      result.current.notifyPhaseChanged(3);

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenNthCalledWith(1, {
        entity: "phase",
        action: "update",
        phaseIndex: 3,
        payload: { phaseIndex: 3 },
      });
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenNthCalledWith(2, {
        entity: "edited_phases",
        action: "update",
        phaseIndex: 3,
        payload: { editedPhases: [0, 2] },
      });
      expect(webSocket.broadcastPhaseChanged).toHaveBeenCalledWith(3);
    });

    it("does not broadcast phase changes while disconnected", () => {
      const { result, webSocket } = setup({ status: "disconnected" });

      result.current.notifyPhaseChanged(1);

      expect(webSocket.broadcastPhaseChanged).not.toHaveBeenCalled();
    });
  });

  describe("map and side changes", () => {
    const map: MapOption = {
      id: "ascent",
      text: "Ascent",
      textColor: "text-white",
    };

    it("enqueues map changes without resetting by default", () => {
      const { result, webSocket, actions } = setup();

      result.current.notifyMapChanged(map);

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledTimes(1);
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith({
        entity: "map",
        action: "update",
        phaseIndex: 2,
        payload: { id: "ascent", text: "Ascent", textColor: "text-white" },
      });
      expect(webSocket.broadcastMapChanged).toHaveBeenCalledWith(map);
    });

    it("resets the canvas when the map reset flag is set", () => {
      const { result, actions } = setup();

      result.current.notifyMapChanged(map, true);

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenNthCalledWith(2, {
        entity: "canvas",
        action: "reset",
        phaseIndex: 2,
        payload: { resetAll: true },
      });
    });

    it("enqueues side changes", () => {
      const { result, webSocket, actions } = setup();

      result.current.notifySideChanged("defense");

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith({
        entity: "side",
        action: "update",
        phaseIndex: 2,
        payload: { mapSide: "defense" },
      });
      expect(webSocket.broadcastSideChanged).toHaveBeenCalledWith("defense");
    });
  });

  describe("icon settings", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("updates agent settings immediately and syncs after debounce", () => {
      const { result, webSocket, actions } = setup();

      result.current.notifyAgentsSettingsChanged({ scale: 2 });

      expect(actions.updateAgentsSettings).toHaveBeenCalledWith({ scale: 2 });
      expect(actions.enqueueCanvasPatchEntry).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(120);
      });

      const merged = { ...actions.agentsSettings, scale: 2 };
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith({
        entity: "agents_settings",
        action: "update",
        phaseIndex: 2,
        payload: { agentsSettings: merged },
      });
      expect(webSocket.broadcastSettingsChanged).toHaveBeenCalledWith({
        agentsSettings: merged,
      });
    });

    it("updates ability settings immediately and syncs after debounce", () => {
      const { result, webSocket, actions } = setup();

      result.current.notifyAbilitiesSettingsChanged({ radius: 8 });

      expect(actions.updateAbilitiesSettings).toHaveBeenCalledWith({
        radius: 8,
      });

      act(() => {
        jest.advanceTimersByTime(120);
      });

      const merged = { ...actions.abilitiesSettings, radius: 8 };
      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledWith({
        entity: "abilities_settings",
        action: "update",
        phaseIndex: 2,
        payload: { abilitiesSettings: merged },
      });
      expect(webSocket.broadcastSettingsChanged).toHaveBeenCalledWith({
        abilitiesSettings: merged,
      });
    });

    it("debounces rapid settings changes", () => {
      const { result, webSocket, actions } = setup();

      result.current.notifyAgentsSettingsChanged({ scale: 2 });
      result.current.notifyAgentsSettingsChanged({ scale: 3 });
      result.current.notifyAgentsSettingsChanged({ scale: 4 });

      act(() => {
        jest.advanceTimersByTime(120);
      });

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledTimes(1);
      expect(webSocket.broadcastSettingsChanged).toHaveBeenCalledTimes(1);
      const merged = { ...actions.agentsSettings, scale: 4 };
      expect(webSocket.broadcastSettingsChanged).toHaveBeenCalledWith({
        agentsSettings: merged,
      });
    });

    it("does not broadcast settings while disconnected", () => {
      const { result, webSocket, actions } = setup({ status: "disconnected" });

      result.current.notifyAbilitiesSettingsChanged({ scale: 2 });

      act(() => {
        jest.advanceTimersByTime(120);
      });

      expect(actions.enqueueCanvasPatchEntry).toHaveBeenCalledTimes(1);
      expect(webSocket.broadcastSettingsChanged).not.toHaveBeenCalled();
    });
  });

  describe("rotating all phases", () => {
    const rotatedPhase = (index: number): PhaseState => ({
      agentsOnCanvas: [{ ...agent, id: `agent-${index}`, x: agent.x + index }],
      abilitiesOnCanvas: [
        { ...ability, id: `ability-${index}`, x: ability.x + index },
      ],
      drawLines: [drawLine(1501, `line-${index}`)],
      connectingLines: [],
      textsOnCanvas: [{ ...text, id: `text-${index}`, x: text.x + index }],
      imagesOnCanvas: [{ ...image, id: `image-${index}`, x: image.x + index }],
      toolIconsOnCanvas: [
        { ...toolIcon, id: `tool-${index}`, x: toolIcon.x + index },
      ],
    });

    it("enqueues update entries for every edited phase entity", () => {
      const { result, actions } = setup({
        editedPhases: new Set([0, 2]),
      });

      result.current.notifyAllPhasesRotated([
        rotatedPhase(0),
        rotatedPhase(1),
        rotatedPhase(2),
      ]);

      const entries = actions.enqueueCanvasPatchEntry.mock.calls.map(
        ([entry]) => entry,
      );

      // Phase 1 is not edited and must be skipped.
      expect(entries.every((entry) => entry.phaseIndex !== 1)).toBe(true);
      expect(entries).toHaveLength(14);

      [0, 2].forEach((phaseIndex) => {
        const phaseEntries = entries.filter(
          (entry) => entry.phaseIndex === phaseIndex,
        );

        expect(
          phaseEntries.map((entry) => [entry.entity, entry.action]),
        ).toEqual([
          ["agent", "update"],
          ["ability", "update"],
          ["text", "update"],
          ["image", "update"],
          ["drawline", "add"],
          ["drawline", "add"],
          ["toolicon", "update"],
        ]);
        expect(phaseEntries[0].id).toBe(`agent-${phaseIndex}`);
        expect(phaseEntries[4].payload.id).toBe(`line-${phaseIndex}-chunk-0`);
        expect(phaseEntries[5].payload.id).toBe(`line-${phaseIndex}-chunk-1`);
      });
    });

    it("does nothing when no phases are edited", () => {
      const { result, actions } = setup({ editedPhases: new Set() });

      result.current.notifyAllPhasesRotated([rotatedPhase(0), rotatedPhase(1)]);

      expect(actions.enqueueCanvasPatchEntry).not.toHaveBeenCalled();
    });
  });
});
