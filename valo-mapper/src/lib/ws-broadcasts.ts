import type {
  AbilityCanvas,
  AgentCanvas,
  ConnectingLine,
  DrawLine,
  ImageCanvas,
  ImagePositionData,
  MapOption,
  MapSide,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";
import {
  WS_MESSAGE_TYPES,
  type AbilityMessageData,
  type AgentMessageData,
  type ConnectingLineMessageData,
  type DrawLineMessageData,
  type ImageMessageData,
  type ImageMoveMessageData,
  type MapChangedData,
  type PhaseChangedData,
  type RemoveElementData,
  type SettingsChangedData,
  type SideChangedData,
  type TextMessageData,
  type ToolIconMessageData,
} from "@/lib/websocket-types";

type SendMessage = <T>(type: string, data: T, phaseIndex?: number) => void;

export const createCanvasBroadcasters = (sendMessage: SendMessage) => ({
  broadcastAgentAdded: (agent: AgentCanvas, phaseIndex: number) => {
    sendMessage<AgentMessageData>(
      WS_MESSAGE_TYPES.AGENT_ADDED,
      { agent },
      phaseIndex,
    );
  },
  broadcastAgentMoved: (agent: AgentCanvas, phaseIndex: number) => {
    sendMessage<AgentMessageData>(
      WS_MESSAGE_TYPES.AGENT_MOVED,
      { agent },
      phaseIndex,
    );
  },
  broadcastAgentRemoved: (id: string, phaseIndex: number) => {
    sendMessage<RemoveElementData>(
      WS_MESSAGE_TYPES.AGENT_REMOVED,
      { id },
      phaseIndex,
    );
  },
  broadcastAbilityAdded: (ability: AbilityCanvas, phaseIndex: number) => {
    sendMessage<AbilityMessageData>(
      WS_MESSAGE_TYPES.ABILITY_ADDED,
      { ability },
      phaseIndex,
    );
  },
  broadcastAbilityMoved: (ability: AbilityCanvas, phaseIndex: number) => {
    sendMessage<AbilityMessageData>(
      WS_MESSAGE_TYPES.ABILITY_MOVED,
      { ability },
      phaseIndex,
    );
  },
  broadcastAbilityRemoved: (id: string, phaseIndex: number) => {
    sendMessage<RemoveElementData>(
      WS_MESSAGE_TYPES.ABILITY_REMOVED,
      { id },
      phaseIndex,
    );
  },
  broadcastLineDrawn: (line: DrawLine, phaseIndex: number) => {
    sendMessage<DrawLineMessageData>(
      WS_MESSAGE_TYPES.LINE_DRAWN,
      { line },
      phaseIndex,
    );
  },
  broadcastLineRemoved: (id: string, phaseIndex: number) => {
    sendMessage<RemoveElementData>(
      WS_MESSAGE_TYPES.LINE_REMOVED,
      { id },
      phaseIndex,
    );
  },
  broadcastConnLineAdded: (line: ConnectingLine, phaseIndex: number) => {
    sendMessage<ConnectingLineMessageData>(
      WS_MESSAGE_TYPES.CONN_LINE_ADDED,
      { line },
      phaseIndex,
    );
  },
  broadcastConnLineUpdated: (line: ConnectingLine, phaseIndex: number) => {
    sendMessage<ConnectingLineMessageData>(
      WS_MESSAGE_TYPES.CONN_LINE_UPDATED,
      { line },
      phaseIndex,
    );
  },
  broadcastConnLineRemoved: (id: string, phaseIndex: number) => {
    sendMessage<RemoveElementData>(
      WS_MESSAGE_TYPES.CONN_LINE_REMOVED,
      { id },
      phaseIndex,
    );
  },
  broadcastTextAdded: (text: TextCanvas, phaseIndex: number) => {
    sendMessage<TextMessageData>(
      WS_MESSAGE_TYPES.TEXT_ADDED,
      { text },
      phaseIndex,
    );
  },
  broadcastTextUpdated: (text: TextCanvas, phaseIndex: number) => {
    sendMessage<TextMessageData>(
      WS_MESSAGE_TYPES.TEXT_UPDATED,
      { text },
      phaseIndex,
    );
  },
  broadcastTextRemoved: (id: string, phaseIndex: number) => {
    sendMessage<RemoveElementData>(
      WS_MESSAGE_TYPES.TEXT_REMOVED,
      { id },
      phaseIndex,
    );
  },
  broadcastImageAdded: (image: ImageCanvas, phaseIndex: number) => {
    sendMessage<ImageMessageData>(
      WS_MESSAGE_TYPES.IMAGE_ADDED,
      { image },
      phaseIndex,
    );
  },
  broadcastImageMoved: (image: ImagePositionData, phaseIndex: number) => {
    sendMessage<ImageMoveMessageData>(
      WS_MESSAGE_TYPES.IMAGE_MOVED,
      { image },
      phaseIndex,
    );
  },
  broadcastImageRemoved: (id: string, phaseIndex: number) => {
    sendMessage<RemoveElementData>(
      WS_MESSAGE_TYPES.IMAGE_REMOVED,
      { id },
      phaseIndex,
    );
  },
  broadcastToolIconAdded: (toolIcon: ToolIconCanvas, phaseIndex: number) => {
    sendMessage<ToolIconMessageData>(
      WS_MESSAGE_TYPES.TOOL_ICON_ADDED,
      { toolIcon },
      phaseIndex,
    );
  },
  broadcastToolIconMoved: (toolIcon: ToolIconCanvas, phaseIndex: number) => {
    sendMessage<ToolIconMessageData>(
      WS_MESSAGE_TYPES.TOOL_ICON_MOVED,
      { toolIcon },
      phaseIndex,
    );
  },
  broadcastToolIconRemoved: (id: string, phaseIndex: number) => {
    sendMessage<RemoveElementData>(
      WS_MESSAGE_TYPES.TOOL_ICON_REMOVED,
      { id },
      phaseIndex,
    );
  },
  broadcastMapChanged: (selectedMap: MapOption) => {
    sendMessage<MapChangedData>(WS_MESSAGE_TYPES.MAP_CHANGED, { selectedMap });
  },
  broadcastSideChanged: (mapSide: MapSide) => {
    sendMessage<SideChangedData>(WS_MESSAGE_TYPES.SIDE_CHANGED, { mapSide });
  },
  broadcastPhaseChanged: (phaseIndex: number) => {
    sendMessage<PhaseChangedData>(WS_MESSAGE_TYPES.PHASE_CHANGED, {
      phaseIndex,
    });
  },
  broadcastSettingsChanged: (settings: SettingsChangedData) => {
    sendMessage<SettingsChangedData>(
      WS_MESSAGE_TYPES.SETTINGS_CHANGED,
      settings,
    );
  },
});
