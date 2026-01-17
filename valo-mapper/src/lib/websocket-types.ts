import {
  AbilityCanvas,
  AgentCanvas,
  ConnectingLine,
  DrawLine,
  ImageCanvas,
  ImagePositionData,
  MapOption,
  MapSide,
  PhaseState,
  TextCanvas,
  ToolIconCanvas,
} from "./types";

export const WS_MESSAGE_TYPES = {
  AGENT_ADDED: "agent_added",
  AGENT_MOVED: "agent_moved",
  AGENT_REMOVED: "agent_removed",
  ABILITY_ADDED: "ability_added",
  ABILITY_MOVED: "ability_moved",
  ABILITY_REMOVED: "ability_removed",
  LINE_DRAWN: "line_drawn",
  LINE_REMOVED: "line_removed",
  CONN_LINE_ADDED: "connecting_line_added",
  CONN_LINE_REMOVED: "connecting_line_removed",
  CONN_LINE_UPDATED: "connecting_line_updated",
  TEXT_ADDED: "text_added",
  TEXT_UPDATED: "text_updated",
  TEXT_REMOVED: "text_removed",
  IMAGE_ADDED: "image_added",
  IMAGE_MOVED: "image_moved",
  IMAGE_REMOVED: "image_removed",
  TOOL_ICON_ADDED: "tool_icon_added",
  TOOL_ICON_MOVED: "tool_icon_moved",
  TOOL_ICON_REMOVED: "tool_icon_removed",

  MAP_CHANGED: "map_changed",
  SIDE_CHANGED: "side_changed",
  PHASE_CHANGED: "phase_changed",
  FULL_SYNC: "full_sync",
  LOBBY_UPDATED: "lobby_updated",

  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  USER_LIST: "user_list",
  CURSOR_MOVE: "cursor_move",
  USER_TYPING: "user_typing",

  BATCH_UPDATE: "batch_update",
} as const;

export type WSMessageType =
  (typeof WS_MESSAGE_TYPES)[keyof typeof WS_MESSAGE_TYPES];

export type UserPresence = {
  id: string;
  username: string;
  color: string;
  cursor?: { x: number; y: number };
};

export type WSMessage<T = Record<string, unknown>> = {
  type: WSMessageType;
  phaseIndex?: number;
  data: T;
  timestamp?: number;
};

export type AgentMessageData = {
  agent: AgentCanvas;
};

export type AbilityMessageData = {
  ability: AbilityCanvas;
};

export type DrawLineMessageData = {
  line: DrawLine;
};

export type ConnectingLineMessageData = {
  line: ConnectingLine;
};

export type TextMessageData = {
  text: TextCanvas;
};

export type ImageMessageData = {
  image: ImageCanvas;
};

export type ImageMoveMessageData = {
  image: ImagePositionData;
};

export type LobbyUpdatedData = {
  reason: string;
  username: string;
};

export type ToolIconMessageData = {
  toolIcon: ToolIconCanvas;
};

export type MapChangedData = {
  selectedMap: MapOption;
};

export type SideChangedData = {
  mapSide: MapSide;
};

export type PhaseChangedData = {
  phaseIndex: number;
  phase?: PhaseState;
};

export type UserListData = {
  users: UserPresence[];
};

export type CursorMoveData = {
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
};

export type RemoveElementData = {
  id: string;
};

export type FullSyncData = {
  phases: PhaseState[];
  selectedMap: MapOption;
  mapSide: MapSide;
  currentPhaseIndex: number;
  editedPhases: number[];
};

export type WSConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
