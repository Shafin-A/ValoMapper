import { Vector2d } from "konva/lib/types";

export type MapOption = {
  id: string;
  text: string;
  textColor: string;
};

export type Agent = {
  name: string;
  role: AgentRole;
};

export type BaseCanvasItem = {
  id: string;
  x: number;
  y: number;
};

export type CanvasItem = BaseCanvasItem & {
  name: string;
  isAlly: boolean;
};

export type TextCanvas = BaseCanvasItem & {
  text: string;
  width: number;
  height: number;
};

export type ImageCanvas = BaseCanvasItem & {
  src: string;
  width: number;
  height: number;
};

export type AgentCanvas = CanvasItem & {
  role: AgentRole;
};

export type AbilityCanvas = CanvasItem & {
  action: AbilityAction;
  currentRotation?: number;
  currentLength?: number;
  currentPath?: Vector2d[];
};

export type AgentRole = "Duelist" | "Controller" | "Initiator" | "Sentinel";

export type EraserSettings = {
  size: number;
  mode: "pixel" | "line";
};

export type DrawSettings = {
  size: number;
  color: string;
  isDashed: boolean;
  isArrowHead: boolean;
};

export type IconSettings = {
  scale: number;
  borderOpacity: number;
  borderWidth: number;
  radius: number;
  allyColor: string;
  enemyColor: string;
};

export type AbilityIconItem = {
  id: string;
  src: string;
  name: string;
  action: AbilityAction;
};

export type AbilityIconConfig = AbilityIconItem[];

export type AbilityAction =
  | "icon"
  | "astra_stun"
  | "astra_suck"
  | "astra_smoke"
  | "astra_ult"
  | "breach_aftershock"
  | "breach_stun"
  | "breach_ult"
  | "brim_smoke"
  | "brim_stim"
  | "brim_molly"
  | "brim_ult"
  | "chamber_trip"
  | "chamber_tp"
  | "clove_meddle"
  | "clove_smoke"
  | "cypher_cage"
  | "cypher_trip"
  | "deadlock_trip"
  | "deadlock_net"
  | "deadlock_wall"
  | "fade_eye"
  | "fade_seize"
  | "fade_ult"
  | "gekko_molly"
  | "harbor_blind"
  | "harbor_cove"
  | "harbor_wall"
  | "harbor_ult"
  | "iso_wall"
  | "iso_vuln"
  | "iso_ult"
  | "jett_smoke"
  | "kayo_molly"
  | "kayo_knife"
  | "kayo_ult"
  | "kj_alarmbot"
  | "kj_molly"
  | "kj_turret"
  | "kj_ult"
  | "neon_stun"
  | "neon_wall"
  | "omen_blind"
  | "omen_smoke"
  | "phoenix_molly"
  | "phoenix_wall"
  | "sage_wall"
  | "skye_heal"
  | "sova_shock_dart"
  | "sova_dart"
  | "sova_ult"
  | "tejo_drone"
  | "tejo_stun"
  | "tejo_missile"
  | "tejo_ult"
  | "veto_teleport"
  | "veto_molly"
  | "veto_interceptor"
  | "viper_molly"
  | "viper_smoke"
  | "viper_wall"
  | "vyse_slow"
  | "vyse_wall"
  | "vyse_ult"
  | "waylay_slow"
  | "waylay_ult";

export type LineAbility = Extract<
  AbilityAction,
  | "astra_ult"
  | "breach_aftershock"
  | "breach_ult"
  | "deadlock_trip"
  | "fade_ult"
  | "harbor_ult"
  | "iso_wall"
  | "iso_vuln"
  | "iso_ult"
  | "omen_blind"
  | "sage_wall"
  | "sova_ult"
  | "tejo_ult"
  | "viper_wall"
  | "vyse_wall"
  | "waylay_ult"
>;

export type ArcAbility = Extract<AbilityAction, "kj_turret">;

export type XLineAbility = Extract<AbilityAction, "deadlock_wall">;

export type DoubleLineAbility = Extract<AbilityAction, "neon_wall">;

export type CurvableLineAbility = Extract<
  AbilityAction,
  "harbor_wall" | "phoenix_wall"
>;

export type AdjustableLineAbility = Extract<
  AbilityAction,
  "breach_stun" | "cypher_trip"
>;

export type CircleAbility = Extract<
  AbilityAction,
  | "astra_stun"
  | "astra_suck"
  | "astra_smoke"
  | "brim_smoke"
  | "brim_stim"
  | "brim_molly"
  | "brim_ult"
  | "chamber_trip"
  | "chamber_tp"
  | "clove_meddle"
  | "clove_smoke"
  | "cypher_cage"
  | "deadlock_net"
  | "fade_eye"
  | "fade_seize"
  | "gekko_molly"
  | "harbor_cove"
  | "harbor_blind"
  | "jett_smoke"
  | "kayo_molly"
  | "kayo_knife"
  | "kayo_ult"
  | "kj_alarmbot"
  | "kj_molly"
  | "kj_ult"
  | "neon_stun"
  | "omen_smoke"
  | "phoenix_molly"
  | "skye_heal"
  | "sova_shock_dart"
  | "sova_dart"
  | "tejo_drone"
  | "tejo_stun"
  | "tejo_missile"
  | "veto_teleport"
  | "veto_molly"
  | "veto_interceptor"
  | "viper_molly"
  | "viper_smoke"
  | "vyse_slow"
  | "vyse_ult"
  | "waylay_slow"
>;

export type Tool = "pencil" | "eraser";

export type DrawLine = {
  id: string;
  tool: Tool;
  points: Vector2d[];
  color: string;
  size: number;
  isDashed: boolean;
  isArrowHead: boolean;
};

export type MapSide = "attack" | "defense";

export type UndoableState = {
  phases: PhaseState[];
  selectedMap: MapOption;
  mapSide: MapSide;
  currentPhaseIndex: number;
  editedPhases: number[];
};

export type ToolIconCanvas = BaseCanvasItem & {
  name: string;
  width: number;
  height: number;
};

export type PhaseState = {
  agentsOnCanvas: AgentCanvas[];
  abilitiesOnCanvas: AbilityCanvas[];
  drawLines: DrawLine[];
  textsOnCanvas: TextCanvas[];
  imagesOnCanvas: ImageCanvas[];
  toolIconsOnCanvas: ToolIconCanvas[];
};

export type CanvasState = UndoableState;

export type Lobby = {
  lobbyCode: string;
  createdAt: Date;
  canvasState: CanvasState | null;
  updatedAt: Date;
};

export type StrategyData = {
  id: string;
  name: string;
  type: "folder" | "strategy";
  lobbyCode?: string;
  selectedMapId?: string;
  updatedAt?: Date;
  children?: StrategyData[];
};

export type Folder = {
  id: number;
  userId: number;
  name: string;
  parentFolderId?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Strategy = {
  id: number;
  userId: number;
  folderId?: number;
  name: string;
  selectedMapId: string;
  lobbyCode: string;
  updatedAt: Date;
};

export type User = {
  id: number;
  firebaseUid: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};
