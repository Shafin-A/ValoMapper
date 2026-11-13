import type { Vector2d } from "konva/lib/types";
import type { AbilityAction } from "./ability";
import type { AgentRole } from "./agent";
import type { MapOption, MapSide } from "./map";

export type BaseCanvasItem = {
  id: string;
  x: number;
  y: number;
};

export type CanvasItem = BaseCanvasItem & {
  name: string;
  isAlly: boolean;
};

export type TextStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
};

export type TextSpan = TextStyle & {
  text: string;
};

export type TextCanvas = BaseCanvasItem & {
  text: string;
  spans?: TextSpan[];
  fontSize?: number;
  width: number;
  height: number;
};

export type ImageCanvas = BaseCanvasItem & {
  src: string;
  width: number;
  height: number;
};

export type ImagePositionData = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CanvasPatchEntry = {
  entity: string;
  action: string;
  phaseIndex: number;
  id?: string;
  payload?: Record<string, unknown>;
};

export type CanvasPatch = {
  entries: CanvasPatchEntry[];
};

export type AgentCanvas = CanvasItem & {
  role: AgentRole;
  isGray?: boolean;
};

export type AbilityCanvas = CanvasItem & {
  action: AbilityAction;
  currentRotation?: number;
  currentLength?: number;
  currentPath?: Vector2d[];
  iconOnly?: boolean;
  showOuterCircle?: boolean;
  attachedToId?: string;
};

export type EraserSettings = {
  size: number;
  mode: "pixel" | "line";
};

export type DrawShape = "freehand" | "straight" | "rectangle" | "circle";

export type TraversalTimeOption =
  | "knife-run"
  | "knife-walk"
  | "phantom-vandal-run"
  | "phantom-vandal-walk";

export type TraversalWeapon = "knife" | "phantom-vandal";

export type TraversalMovement = "run" | "walk";

export type TraversalSelection = {
  weapon: TraversalWeapon | null;
  movement: TraversalMovement | null;
};

export type DrawSettings = {
  size: number;
  color: string;
  isDashed: boolean;
  isArrowHead: boolean;
  shape: DrawShape;
  opacity: number;
  traversalTime?: TraversalTimeOption | null;
};

export type IconSettings = {
  scale: number;
  borderOpacity: number;
  borderWidth: number;
  radius: number;
  allyColor: string;
  enemyColor: string;
};

export type Tool = "pencil" | "eraser";

export type DrawLine = {
  id: string;
  tool: Tool;
  points: Vector2d[];
  color: string;
  size: number;
  isDashed: boolean;
  isArrowHead: boolean;
  shape?: DrawShape;
  opacity?: number;
  traversalTime?: TraversalTimeOption | null;
  parentId?: string;
  chunkIndex?: number;
  totalChunks?: number;
};

export type ConnectingLine = {
  id: string;
  fromId: string;
  toId: string;
  strokeColor: string;
  strokeWidth: number;
  uploadedImages?: string[];
  youtubeLink?: string;
  notes?: string;
  isInteractive?: boolean;
};

export type UndoableState = {
  phases: PhaseState[];
  selectedMap: MapOption;
  mapSide: MapSide;
  currentPhaseIndex: number;
  editedPhases: number[];
  agentsSettings?: IconSettings;
  abilitiesSettings?: IconSettings;
};

export type ToolIconCanvas = BaseCanvasItem & {
  name: string;
  width: number;
  height: number;
  attachedToId?: string;
};

export type PhaseState = {
  agentsOnCanvas: AgentCanvas[];
  abilitiesOnCanvas: AbilityCanvas[];
  drawLines: DrawLine[];
  connectingLines: ConnectingLine[];
  textsOnCanvas: TextCanvas[];
  imagesOnCanvas: ImageCanvas[];
  toolIconsOnCanvas: ToolIconCanvas[];
};

export type CanvasState = UndoableState;

export type ItemType = "agent" | "ability" | "text" | "image" | "tool";

export type CanvasSelectionItem = {
  id: string;
  type: ItemType;
};

export type CanvasItemInstance =
  | { type: "agent"; item: AgentCanvas }
  | { type: "ability"; item: AbilityCanvas }
  | { type: "text"; item: TextCanvas }
  | { type: "image"; item: ImageCanvas }
  | { type: "tool"; item: ToolIconCanvas };
