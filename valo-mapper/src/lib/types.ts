export type Agent = {
  name: string;
  src: string;
  role: AgentRole;
};

export type CanvasItem = {
  id: string;
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
  currentRotation?: number;
  currentLength?: number;
};

export type AgentRole = "Duelist" | "Controller" | "Initiator" | "Sentinel";

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
  | "harbor_cascade_wall"
  | "harbor_cove"
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
  | "kj_ult"
  | "neon_stun"
  | "neon_wall"
  | "omen_blind"
  | "omen_smoke"
  | "phoenix_molly"
  | "sage_wall"
  | "skye_heal"
  | "sova_shock_dart"
  | "sova_dart"
  | "sova_ult"
  | "tejo_drone"
  | "tejo_stun"
  | "tejo_missile"
  | "tejo_ult"
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

export type XLineAbility = Extract<AbilityAction, "deadlock_wall">;

export type DoubleLineAbility = Extract<AbilityAction, "neon_wall">;

export type AdjustableLineAbility = Extract<
  AbilityAction,
  "breach_stun" | "cypher_trip" | "harbor_cascade_wall"
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
  | "harbor_ult"
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
  | "viper_molly"
  | "viper_smoke"
  | "vyse_slow"
  | "vyse_ult"
  | "waylay_slow"
>;
