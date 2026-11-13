export type AbilityAction =
  | "icon"
  | "astra_smoke"
  | "astra_stun"
  | "astra_suck"
  | "astra_ult"
  | "breach_aftershock"
  | "breach_stun"
  | "breach_ult"
  | "brim_molly"
  | "brim_smoke"
  | "brim_stim"
  | "brim_ult"
  | "chamber_tp"
  | "chamber_trip"
  | "clove_meddle"
  | "clove_smoke"
  | "cypher_cage"
  | "cypher_trip"
  | "deadlock_net"
  | "deadlock_trip"
  | "deadlock_wall"
  | "fade_eye"
  | "fade_seize"
  | "fade_ult"
  | "gekko_molly"
  | "harbor_blind"
  | "harbor_cove"
  | "harbor_ult"
  | "harbor_wall"
  | "hush_suck"
  | "hush_ult"
  | "iso_ult"
  | "iso_vuln"
  | "iso_wall"
  | "jett_smoke"
  | "kayo_knife"
  | "kayo_molly"
  | "kayo_ult"
  | "kj_alarmbot"
  | "kj_molly"
  | "kj_turret"
  | "kj_ult"
  | "miks_heal"
  | "miks_smoke"
  | "miks_stun"
  | "miks_ult"
  | "neon_stun"
  | "neon_wall"
  | "omen_blind"
  | "omen_smoke"
  | "phoenix_molly"
  | "phoenix_wall"
  | "sage_wall"
  | "skye_heal"
  | "sova_dart"
  | "sova_shock_dart"
  | "sova_ult"
  | "tejo_drone"
  | "tejo_missile"
  | "tejo_stun"
  | "tejo_ult"
  | "veto_interceptor"
  | "veto_molly"
  | "veto_teleport"
  | "viper_molly"
  | "viper_pit"
  | "viper_smoke"
  | "viper_wall"
  | "vyse_slow"
  | "vyse_ult"
  | "vyse_wall"
  | "waylay_slow"
  | "waylay_ult"
  | "vision_cone_30"
  | "vision_cone_60"
  | "vision_cone_90"
  | "vision_cone_103";

export type AbilityIconItem = {
  id: string;
  src: string;
  name: string;
  action: AbilityAction;
  /** Replay-only shape override; the lobby keeps `action`. */
  replayAction?: AbilityAction;
  slot: string;
  /** Max charges available at the start of a round, when the ability uses charges. */
  charges?: number;
};

export type AbilityAlternate = {
  id: string;
  src: string;
  name: string;
  action: AbilityAction;
  replayAction?: AbilityAction;
  slot: string;
};

export type AbilityIconDefinition = AbilityIconItem & {
  alternates?: AbilityAlternate[];
};

export type AbilityIconConfig = AbilityIconDefinition[];

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

export type ArcAbility = Extract<
  AbilityAction,
  | "kj_turret"
  | "miks_ult"
  | "vision_cone_30"
  | "vision_cone_60"
  | "vision_cone_90"
  | "vision_cone_103"
>;

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
  | "astra_smoke"
  | "astra_stun"
  | "astra_suck"
  | "brim_molly"
  | "brim_smoke"
  | "brim_stim"
  | "brim_ult"
  | "chamber_tp"
  | "chamber_trip"
  | "clove_meddle"
  | "clove_smoke"
  | "cypher_cage"
  | "deadlock_net"
  | "fade_eye"
  | "fade_seize"
  | "gekko_molly"
  | "harbor_blind"
  | "harbor_cove"
  | "hush_suck"
  | "hush_ult"
  | "jett_smoke"
  | "kayo_knife"
  | "kayo_molly"
  | "kayo_ult"
  | "kj_alarmbot"
  | "kj_molly"
  | "kj_ult"
  | "miks_heal"
  | "miks_smoke"
  | "miks_stun"
  | "neon_stun"
  | "omen_smoke"
  | "phoenix_molly"
  | "skye_heal"
  | "sova_dart"
  | "sova_shock_dart"
  | "tejo_drone"
  | "tejo_missile"
  | "tejo_stun"
  | "veto_interceptor"
  | "veto_molly"
  | "veto_teleport"
  | "viper_molly"
  | "viper_pit"
  | "viper_smoke"
  | "vyse_slow"
  | "vyse_ult"
  | "waylay_slow"
>;
