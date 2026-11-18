import { createCanvasBroadcasters } from "@/lib/ws-broadcasts";
import { WS_MESSAGE_TYPES } from "@/lib/websocket-types";

const sendMessage = jest.fn();
const broadcasters = createCanvasBroadcasters(sendMessage);

const lastCall = () => sendMessage.mock.calls[sendMessage.mock.calls.length - 1];

describe("createCanvasBroadcasters", () => {
  beforeEach(() => {
    sendMessage.mockClear();
  });

  it("sends agent lifecycle messages with the phase index", () => {
    const agent = { id: "agent-1" } as never;

    broadcasters.broadcastAgentAdded(agent, 2);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.AGENT_ADDED,
      { agent },
      2,
    ]);

    broadcasters.broadcastAgentMoved(agent, 3);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.AGENT_MOVED,
      { agent },
      3,
    ]);

    broadcasters.broadcastAgentRemoved("agent-1", 4);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.AGENT_REMOVED,
      { id: "agent-1" },
      4,
    ]);
  });

  it("sends ability lifecycle messages with the phase index", () => {
    const ability = { id: "ability-1" } as never;

    broadcasters.broadcastAbilityAdded(ability, 0);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.ABILITY_ADDED,
      { ability },
      0,
    ]);

    broadcasters.broadcastAbilityMoved(ability, 1);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.ABILITY_MOVED,
      { ability },
      1,
    ]);

    broadcasters.broadcastAbilityRemoved("ability-1", 2);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.ABILITY_REMOVED,
      { id: "ability-1" },
      2,
    ]);
  });

  it("sends draw line messages", () => {
    const line = { id: "line-1" } as never;

    broadcasters.broadcastLineDrawn(line, 1);
    expect(lastCall()).toEqual([WS_MESSAGE_TYPES.LINE_DRAWN, { line }, 1]);

    broadcasters.broadcastLineRemoved("line-1", 1);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.LINE_REMOVED,
      { id: "line-1" },
      1,
    ]);
  });

  it("sends connecting line messages", () => {
    const line = { id: "conn-1" } as never;

    broadcasters.broadcastConnLineAdded(line, 0);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.CONN_LINE_ADDED,
      { line },
      0,
    ]);

    broadcasters.broadcastConnLineUpdated(line, 0);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.CONN_LINE_UPDATED,
      { line },
      0,
    ]);

    broadcasters.broadcastConnLineRemoved("conn-1", 0);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.CONN_LINE_REMOVED,
      { id: "conn-1" },
      0,
    ]);
  });

  it("sends text messages", () => {
    const text = { id: "text-1" } as never;

    broadcasters.broadcastTextAdded(text, 1);
    expect(lastCall()).toEqual([WS_MESSAGE_TYPES.TEXT_ADDED, { text }, 1]);

    broadcasters.broadcastTextUpdated(text, 2);
    expect(lastCall()).toEqual([WS_MESSAGE_TYPES.TEXT_UPDATED, { text }, 2]);

    broadcasters.broadcastTextRemoved("text-1", 3);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.TEXT_REMOVED,
      { id: "text-1" },
      3,
    ]);
  });

  it("sends image messages including position-only moves", () => {
    const image = { id: "image-1" } as never;
    const position = { id: "image-1", x: 1, y: 2, width: 3, height: 4 };

    broadcasters.broadcastImageAdded(image, 0);
    expect(lastCall()).toEqual([WS_MESSAGE_TYPES.IMAGE_ADDED, { image }, 0]);

    broadcasters.broadcastImageMoved(position, 0);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.IMAGE_MOVED,
      { image: position },
      0,
    ]);

    broadcasters.broadcastImageUpdated(image, 1);
    expect(lastCall()).toEqual([WS_MESSAGE_TYPES.IMAGE_UPDATED, { image }, 1]);

    broadcasters.broadcastImageRemoved("image-1", 1);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.IMAGE_REMOVED,
      { id: "image-1" },
      1,
    ]);
  });

  it("sends tool icon messages", () => {
    const toolIcon = { id: "tool-1" } as never;

    broadcasters.broadcastToolIconAdded(toolIcon, 0);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.TOOL_ICON_ADDED,
      { toolIcon },
      0,
    ]);

    broadcasters.broadcastToolIconMoved(toolIcon, 0);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.TOOL_ICON_MOVED,
      { toolIcon },
      0,
    ]);

    broadcasters.broadcastToolIconRemoved("tool-1", 0);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.TOOL_ICON_REMOVED,
      { id: "tool-1" },
      0,
    ]);
  });

  it("sends map, side, phase, and settings changes without a phase index", () => {
    const selectedMap = { id: "ascent", text: "Ascent" } as never;
    const settings = { agentsSettings: { scale: 1 } } as never;

    broadcasters.broadcastMapChanged(selectedMap);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.MAP_CHANGED,
      { selectedMap },
    ]);

    broadcasters.broadcastSideChanged("defense");
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.SIDE_CHANGED,
      { mapSide: "defense" },
    ]);

    broadcasters.broadcastPhaseChanged(4);
    expect(lastCall()).toEqual([
      WS_MESSAGE_TYPES.PHASE_CHANGED,
      { phaseIndex: 4 },
    ]);

    broadcasters.broadcastSettingsChanged(settings);
    expect(lastCall()).toEqual([WS_MESSAGE_TYPES.SETTINGS_CHANGED, settings]);
  });
});
