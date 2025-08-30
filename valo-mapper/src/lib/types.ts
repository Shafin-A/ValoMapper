export type Agent = {
  name: string;
  src: string;
  role: AgentRole;
};

export type AbilityAction = "draggable" | "static" | "animated" | "interactive";

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
