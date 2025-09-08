export type Agent = {
  name: string;
  src: string;
  role: AgentRole;
};

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

export type AbilityAction =
  | "draggable"
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
  | "harbor_cove";

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
  | "harbor_cove"
>;
