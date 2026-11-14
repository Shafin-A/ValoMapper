import { createWSMessageHandler } from "@/lib/ws-message-handler";
import { WS_MESSAGE_TYPES } from "@/lib/websocket-types";
import type { AgentCanvas } from "@/lib/types";

const agent = (id: string): AgentCanvas => ({
  id,
  name: "Jett",
  role: "Duelist",
  x: 0,
  y: 0,
  isAlly: true,
});

const createHandler = (overrides: Record<string, unknown> = {}) => {
  const deps = {
    currentPhaseIndex: 0,
    editingTextId: null,
    setAgentsOnCanvas: jest.fn(),
    setAbilitiesOnCanvas: jest.fn(),
    setDrawLines: jest.fn(),
    setConnectingLines: jest.fn(),
    setTextsOnCanvas: jest.fn(),
    setImagesOnCanvas: jest.fn(),
    setToolIconsOnCanvas: jest.fn(),
    setSelectedMap: jest.fn(),
    setMapSide: jest.fn(),
    switchToPhase: jest.fn(),
    resetState: jest.fn(),
    rotateCanvasItemsForSideSwap: jest.fn(),
    applyRemoteState: jest.fn(),
    updateAgentsSettings: jest.fn(),
    updateAbilitiesSettings: jest.fn(),
    ...overrides,
  };

  return { deps, handleMessage: createWSMessageHandler(deps as never) };
};

describe("createWSMessageHandler", () => {
  it("inserts new agents and updates existing ones", () => {
    const { deps, handleMessage } = createHandler();
    const updater = deps.setAgentsOnCanvas as jest.Mock;

    handleMessage({
      type: WS_MESSAGE_TYPES.AGENT_ADDED,
      phaseIndex: 0,
      data: { agent: agent("a1") },
    });

    const next = updater.mock.calls[0][0]([agent("a0")]);
    expect(next).toEqual([agent("a0"), agent("a1")]);
  });

  it("ignores entity messages for other phases", () => {
    const { deps, handleMessage } = createHandler();

    handleMessage({
      type: WS_MESSAGE_TYPES.AGENT_ADDED,
      phaseIndex: 1,
      data: { agent: agent("a1") },
    });

    expect(deps.setAgentsOnCanvas).not.toHaveBeenCalled();
  });

  it("skips text updates for the item being edited", () => {
    const { deps, handleMessage } = createHandler({ editingTextId: "t1" });

    handleMessage({
      type: WS_MESSAGE_TYPES.TEXT_UPDATED,
      phaseIndex: 0,
      data: { text: { id: "t1", text: "x", x: 0, y: 0, width: 1, height: 1 } },
    });

    expect(deps.setTextsOnCanvas).not.toHaveBeenCalled();
  });

  it("applies a full sync unless a text edit is in progress", () => {
    const { deps, handleMessage } = createHandler();
    const sync = {
      phases: [],
      selectedMap: { id: "haven", text: "Haven", textColor: "#fff" },
      mapSide: "defense" as const,
      currentPhaseIndex: 0,
      editedPhases: [0],
    };

    handleMessage({ type: WS_MESSAGE_TYPES.FULL_SYNC, data: sync });
    expect(deps.applyRemoteState).toHaveBeenCalledWith(sync);

    const editing = createHandler({ editingTextId: "t1" });
    editing.handleMessage({ type: WS_MESSAGE_TYPES.FULL_SYNC, data: sync });
    expect(editing.deps.applyRemoteState).not.toHaveBeenCalled();
  });

  it("resets and rotates on map and side changes", () => {
    const { deps, handleMessage } = createHandler();

    handleMessage({
      type: WS_MESSAGE_TYPES.MAP_CHANGED,
      data: { selectedMap: { id: "haven", text: "Haven", textColor: "#fff" } },
    });
    expect(deps.setSelectedMap).toHaveBeenCalled();
    expect(deps.resetState).toHaveBeenCalledWith(true);

    handleMessage({
      type: WS_MESSAGE_TYPES.SIDE_CHANGED,
      data: { mapSide: "attack" },
    });
    expect(deps.setMapSide).toHaveBeenCalledWith("attack");
    expect(deps.rotateCanvasItemsForSideSwap).toHaveBeenCalled();
  });

  it("upserts the whole image on image_updated so notes sync", () => {
    const { deps, handleMessage } = createHandler();
    const updater = deps.setImagesOnCanvas as jest.Mock;
    const image = {
      id: "i1",
      src: "image.png",
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      note: "A site default",
    };

    handleMessage({
      type: WS_MESSAGE_TYPES.IMAGE_UPDATED,
      phaseIndex: 0,
      data: { image },
    });

    const next = updater.mock.calls[0][0]([]);
    expect(next).toEqual([image]);
  });
});
