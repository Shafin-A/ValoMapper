export type Agent = {
  name: string;
  src: string;
  role: AgentRole;
};

export type AbilityAction =
  | "draggable"
  | "brim_smoke"
  | "brim_stim"
  | "brim_molly"
  | "brim_ult"
  | "harbor_cove";

export type CanvasItem = {
  id: number;
  name: string;
  src: string;
  isAlly: boolean;
  x: number;
  y: number;
};

export type AgentCanvas = CanvasItem & {
  role: AgentRole;
};

export type AbilityCanvas = CanvasItem & {
  action: AbilityAction;
};

export type AgentRole = "Duelist" | "Controller" | "Initiator" | "Sentinel";

export type IconSettings = {
  scale: number;
  boxOpacity: number;
  radius: number;
  allyColor: string;
  enemyColor: string;
};

export type AgentIconItem = {
  id: string;
  icon: string;
  label: string;
  action: AbilityAction;
};

export type AgentIconConfig = AgentIconItem[];

export type DragPreviewOptions = {
  isAlly: boolean;
  settings: IconSettings;
  stageScale: number;
  action: AbilityAction;
};

export type CircleAbility = Extract<
  AbilityAction,
  "brim_smoke" | "brim_stim" | "brim_molly" | "brim_ult" | "harbor_cove"
>;
