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
  /** Total damage this player received during the round. */
  incomingDamage: number;
  /** Timestamp (ms since round start) at which each ability was cast. */
  abilityCasts: ReplayAbilityCasts;
};

export type ReplayFramePlayer = {
  puuid: string;
  /** Riot world-space position. Converted to canvas space at render time. */
  x: number;
  y: number;
  viewRadians: number;
  hp: number;
  credits: number;
  weaponId?: string;
  armorId?: string;
  /** Remaining points on the equipped armour item; absent means no item. */
  armorPoints?: number;
  alive: boolean;
};

export type ReplaySpikeState =
  "carried" | "loose" | "planted" | "defused" | "detonated";

export type ReplayFrame = {
  timeMs: number;
  players: ReplayFramePlayer[];
  spike: (MatchWorldPosition & { state: ReplaySpikeState }) | null;
};

export type ReplayRound = Omit<RoundSummaryLite, "playerStats"> & {
  /** Team attacking during this round ("Red" | "Blue"). */
  attackTeamId: string;
  durationMs: number;
  playerStats: ReplayRoundPlayer[];
  frames: ReplayFrame[];
  /** Round-relative barrier drop. Playback starts here when present. */
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
  /** 0 - 100 */
  percent: number;
  label: string;
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
