import type { CanvasEntitiesSnapshot } from "@/contexts/canvas-entity-contexts";
import type { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import type {
  CanvasItemCollections,
  ContextMenuCapabilities,
} from "@/lib/canvas-selection";
import type {
  AbilityCanvas,
  AgentCanvas,
  CanvasItemInstance,
  CanvasSelectionItem,
  ConnectingLine,
  ImageCanvas,
  ItemType,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";
import type { KonvaEventObject, Node as KonvaNode } from "konva/lib/Node";
import type { Stage } from "konva/lib/Stage";
import type { Vector2d } from "konva/lib/types";
import type { Dispatch, RefObject, SetStateAction } from "react";

export interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  targetItems: CanvasSelectionItem[];
  anchorId: string;
  anchorType: ItemType;
}

export interface ContextMenuStateWithCapabilities extends ContextMenuState {
  capabilities: ContextMenuCapabilities;
}

export interface CanvasContextMenuDeps {
  stageRef: RefObject<Stage | null>;
  agentsOnCanvas: AgentCanvas[];
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
  abilitiesOnCanvas: AbilityCanvas[];
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
  textsOnCanvas: TextCanvas[];
  setTextsOnCanvas: Dispatch<SetStateAction<TextCanvas[]>>;
  imagesOnCanvas: ImageCanvas[];
  setImagesOnCanvas: Dispatch<SetStateAction<ImageCanvas[]>>;
  toolIconsOnCanvas: ToolIconCanvas[];
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>;
  connectingLines: ConnectingLine[];
  setConnectingLines: Dispatch<SetStateAction<ConnectingLine[]>>;
  selectedCanvasItems: CanvasSelectionItem[];
  setSelectedCanvasItems: Dispatch<SetStateAction<CanvasSelectionItem[]>>;
  getLatestEntities?: () => CanvasEntitiesSnapshot;
  onEditNote?: (target: CanvasSelectionItem) => void;
}

export type CanvasContextMenuNotifications = Pick<
  ReturnType<typeof useCollaborativeCanvas>,
  | "notifyAgentAdded"
  | "notifyAgentMoved"
  | "notifyAgentRemoved"
  | "notifyAbilityAdded"
  | "notifyAbilityMoved"
  | "notifyAbilityRemoved"
  | "notifyTextAdded"
  | "notifyTextRemoved"
  | "notifyImageAdded"
  | "notifyImageRemoved"
  | "notifyToolIconAdded"
  | "notifyToolIconRemoved"
  | "notifyConnLineRemoved"
>;

export interface CanvasContextMenuSession {
  contextMenu: ContextMenuState;
  getEntities: () => CanvasEntitiesSnapshot;
  getCollections: () => CanvasItemCollections;
  getAnchorEntry: () => CanvasItemInstance | null;
  closeContextMenu: () => void;
}

export interface CanvasContextMenuBase extends CanvasContextMenuSession {
  capabilities: ContextMenuCapabilities;
  openContextMenu: (
    targetNode: KonvaNode | null,
    pointerPosition: Vector2d | null,
  ) => void;
  handleContextMenu: (e: KonvaEventObject<PointerEvent>) => void;
  handlePopoverOpenChange: (open: boolean) => void;
}
