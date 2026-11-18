import { enqueueCanvasPhaseSnapshot } from "@/lib/canvas-patches";
import { PhaseState } from "@/lib/types";

const phase: PhaseState = {
  agentsOnCanvas: [
    {
      id: "agent-1",
      name: "Astra",
      isAlly: true,
      role: "Controller",
      x: 1,
      y: 2,
    },
  ],
  abilitiesOnCanvas: [
    {
      id: "ability-1",
      name: "Nova Pulse",
      isAlly: true,
      action: "astra_stun",
      x: 3,
      y: 4,
    },
  ],
  drawLines: [
    {
      id: "line-1",
      tool: "pencil",
      points: [{ x: 0, y: 0 }],
      color: "#ffffff",
      size: 2,
      isDashed: false,
      isArrowHead: false,
    },
  ],
  connectingLines: [
    {
      id: "conn-1",
      fromId: "agent-1",
      toId: "ability-1",
      strokeColor: "#ffffff",
      strokeWidth: 2,
    },
  ],
  textsOnCanvas: [
    { id: "text-1", text: "Rotate", x: 5, y: 6, width: 100, height: 40 },
  ],
  imagesOnCanvas: [
    { id: "image-1", src: "/image.png", x: 7, y: 8, width: 10, height: 10 },
  ],
  toolIconsOnCanvas: [
    { id: "tool-1", name: "Spike", x: 9, y: 10, width: 20, height: 20 },
  ],
};

describe("enqueueCanvasPhaseSnapshot", () => {
  it("enqueues an add entry for every entity in the phase", () => {
    const enqueue = jest.fn();

    enqueueCanvasPhaseSnapshot({
      phase,
      phaseIndex: 2,
      editedPhases: [0],
      enqueue,
    });

    expect(enqueue.mock.calls.map(([entry]) => entry)).toEqual([
      {
        entity: "agent",
        action: "add",
        phaseIndex: 2,
        id: "agent-1",
        payload: phase.agentsOnCanvas[0],
      },
      {
        entity: "ability",
        action: "add",
        phaseIndex: 2,
        id: "ability-1",
        payload: phase.abilitiesOnCanvas[0],
      },
      {
        entity: "drawline",
        action: "add",
        phaseIndex: 2,
        id: "line-1",
        payload: phase.drawLines[0],
      },
      {
        entity: "connectingline",
        action: "add",
        phaseIndex: 2,
        id: "conn-1",
        payload: phase.connectingLines[0],
      },
      {
        entity: "text",
        action: "add",
        phaseIndex: 2,
        id: "text-1",
        payload: phase.textsOnCanvas[0],
      },
      {
        entity: "image",
        action: "add",
        phaseIndex: 2,
        id: "image-1",
        payload: phase.imagesOnCanvas[0],
      },
      {
        entity: "toolicon",
        action: "add",
        phaseIndex: 2,
        id: "tool-1",
        payload: phase.toolIconsOnCanvas[0],
      },
      {
        entity: "edited_phases",
        action: "update",
        phaseIndex: 2,
        payload: { editedPhases: [0, 2] },
      },
    ]);
  });

  it("only emits the edited phases entry for an empty phase", () => {
    const enqueue = jest.fn();

    enqueueCanvasPhaseSnapshot({
      phase: {
        agentsOnCanvas: [],
        abilitiesOnCanvas: [],
        drawLines: [],
        connectingLines: [],
        textsOnCanvas: [],
        imagesOnCanvas: [],
        toolIconsOnCanvas: [],
      },
      phaseIndex: 1,
      editedPhases: new Set([1]),
      enqueue,
    });

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith({
      entity: "edited_phases",
      action: "update",
      phaseIndex: 1,
      payload: { editedPhases: [1, 1] },
    });
  });
});
