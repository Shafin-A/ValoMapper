import type {
  MatchPlayerSummary,
  MatchSummaryResponse,
  MatchWorldPosition,
  RoundEventLogEntry,
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
  ownerPuuid?: string;
  samples?: ReplayUtilityPositionSample[];
  path?: ReplayUtilityPositionSample[];
  vision?: ReplayUtilityVisionSample[];
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
  /**
   * Local-only marker set by the VRF upload source. It is not part of the Go
   * wire payload and must never be sent back to the API.
   */
  source?: "vrf";
  /** Content-addressed server replay id, set for real VRF matches. */
  replayId?: string;
  build?: string;
  durationMs?: number;
  warnings?: string[];
  utilityWarnings?: ReplayUtilityWarnings;
};

export type ReplaySeedPlayer = Pick<
  MatchPlayerSummary,
  "puuid" | "gameName" | "tagLine" | "teamId" | "characterName"
>;

export type ReplaySeedRound = {
  roundNumber: number;
  winningTeam: string;
  roundResultCode: string;
  attackTeamId: string;
  scoreAfterRound: { red: number; blue: number };
  durationMs: number;
  playerStats: ReplayRoundPlayer[];
  eventLog: RoundEventLogEntry[];
};

export type ReplaySeed = {
  matchId: string;
  mapId: string;
  mapName: string;
  queueLabel: string;
  gameStartAt: string;
  totalRounds: number;
  players: ReplaySeedPlayer[];
  viewer: ReplayMatch["viewer"];
  rounds: ReplaySeedRound[];
};

export type ReplayLoadProgress = {
  /** 0 - 100. Ignored by the UI when `indeterminate` is set. */
  percent: number;
  label: string;
  /** The phase has no measurable total, so render an animated bar. */
  indeterminate?: boolean;
};

export type ReplayLoadOptions = {
  onProgress?: (progress: ReplayLoadProgress) => void;
  signal?: AbortSignal;
};

/**
 * The seam between the replay UI and whatever produces replay telemetry.
 *
 * `MockReplayDataSource` generates the demo replay; `VrfReplayDataSource`
 * uploads a `.vrf` to the Go API (XHR, so upload progress is visible) and
 * resolves with the normalised `ReplayMatch` from that response. Reloads fall
 * back to the API's short-TTL cache.
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
