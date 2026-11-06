import type {
  MatchSummaryResponse,
  MatchWorldPosition,
  RoundPlayerStatsLite,
  RoundSummaryLite,
} from "@/lib/types";

export const REPLAY_ABILITY_SLOTS = [
  "Grenade",
  "Ability1",
  "Ability2",
  "Ultimate",
] as const;

export type ReplayAbilitySlot = (typeof REPLAY_ABILITY_SLOTS)[number];

export type ReplayAbilityCasts = Partial<Record<ReplayAbilitySlot, number>>;

export type ReplayRoundPlayer = RoundPlayerStatsLite & {
  weaponId?: string;
  armorId?: string;
  incomingDamage: number;
  abilityCasts: ReplayAbilityCasts;
};

export type ReplayFramePlayer = {
  puuid: string;
  x: number;
  y: number;
  viewRadians: number;
  hp: number;
  credits: number;
  weaponId?: string;
  armorId?: string;
  armorPoints?: number;
  alive: boolean;
};

export type ReplaySpikeState =
  | "carried"
  | "loose"
  | "planted"
  | "defused"
  | "detonated";

export type ReplaySpike = MatchWorldPosition & {
  state: ReplaySpikeState;
  site?: "A" | "B" | "C";
  carrierPuuid?: string;
};

export type ReplayFrame = {
  timeMs: number;
  players: ReplayFramePlayer[];
  spike: ReplaySpike | null;
};

export type ReplayHit = {
  timeMs: number;
  shooterPuuid: string;
  victimPuuid: string;
};

export type ReplayUtilityKind =
  | "smoke"
  | "wall"
  | "molly"
  | "trap"
  | "mobile"
  | "area"
  | "marker";

export type ReplayUtilityPositionSample = {
  timeMs: number;
  x: number;
  y: number;
};

export type ReplayUtilityVisionSample = {
  timeMs: number;
  yaw: number;
  active: boolean;
};

export type ReplayUtilityLengthSample = {
  timeMs: number;
  length: number;
};

export type ReplayUtilityPoint = {
  x: number;
  y: number;
};

export type ReplayUtility = {
  id: string;
  kind: ReplayUtilityKind;
  /** ValoMapper agent-ability catalog id, e.g. "cloudburst" or "prowler". */
  abilityId?: string;
  startTimeMs: number;
  endTimeMs: number;
  position: { x: number; y: number };
  yaw?: number;
  length?: number;
  iconOnly?: boolean;
  /** Placed but not currently active; rendered at reduced opacity. */
  inactive?: boolean;
  ownerPuuid?: string;
  samples?: ReplayUtilityPositionSample[];
  path?: ReplayUtilityPositionSample[];
  vision?: ReplayUtilityVisionSample[];
  lengthSamples?: ReplayUtilityLengthSample[];
  /** Decoded ground-volume cells for abilities with a real cell footprint. */
  polygons?: ReplayUtilityPoint[][];
  /** Exterior edges of those cells. */
  boundary?: ReplayUtilityPoint[][];
  /** Fraction of a moving utility's full path that actually runs. */
  stopFraction?: number;
};

export type ReplayUtilityWarnings = {
  unknownActors?: number;
  invalidActors?: number;
  missingPositions?: number;
  missingCloses?: number;
  unresolvedOwners?: number;
  missingMovement?: number;
  truncatedUtilities?: number;
  truncatedSamples?: number;
  truncatedPaths?: number;
  unsupportedBuild?: number;
};

export type ReplayRound = Omit<RoundSummaryLite, "playerStats"> & {
  /** Team attacking during this round ("Red" | "Blue"). */
  attackTeamId: string;
  durationMs: number;
  playerStats: ReplayRoundPlayer[];
  frames: ReplayFrame[];
  hits?: ReplayHit[];
  utilities?: ReplayUtility[];
  buyEndTimeMs?: number;
};

export type ReplayMatch = Omit<MatchSummaryResponse, "rounds"> & {
  rounds: ReplayRound[];
  /** Local-only marker: "vrf" and "demo" matches own their decoded frames. */
  source?: "vrf" | "demo";
  /** Content-addressed server replay id, set for real VRF matches. */
  replayId?: string;
  build?: string;
  durationMs?: number;
  warnings?: string[];
  utilityWarnings?: ReplayUtilityWarnings;
};

export type ReplayLoadProgress = {
  percent: number;
  label: string;
  indeterminate?: boolean;
};

export type ReplayLoadOptions = {
  onProgress?: (progress: ReplayLoadProgress) => void;
  signal?: AbortSignal;
};

/**
 * Seam between the replay UI and replay telemetry producers. The demo source
 * reads a baked asset; the VRF source uploads to the Go API.
 */
export interface ReplayDataSource {
  load(file: File, options?: ReplayLoadOptions): Promise<ReplayMatch>;
  /** Optional "try a demo replay" entry point. */
  loadDemo?(options?: ReplayLoadOptions): Promise<ReplayMatch>;
}

export type ReplaySession = {
  replayId: string;
  match: ReplayMatch;
};
