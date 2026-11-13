export type MatchPreview = {
  matchId: string;
  playedAt: number;
  queueLabel: string;
  mapId: string;
  mapName: string;
  result: "Win" | "Loss" | string;
  teamScore: number;
  enemyScore: number;
  kills: number;
  deaths: number;
  assists: number;
  personalScore: number;
  agentId: string;
  agentName: string;
};

export type RoundPlayerStatsLite = {
  puuid: string;
  score: number;
  kills: number;
  deaths: number;
  assists: number;
  economy: {
    loadoutValue: number;
    remaining: number;
  };
};

export type MatchWorldPosition = {
  x: number;
  y: number;
};

export type MatchPlayerLocation = {
  puuid: string;
  viewRadians: number;
  location: MatchWorldPosition;
};

export type RoundEventLogEntry =
  | {
      eventType: "kill";
      timeSinceRoundStartMillis: number;
      killerPuuid: string;
      victimPuuid: string;
      damageType?:
        | "Weapon"
        | "Bomb"
        | "Ability"
        | "Fall"
        | "Melee"
        | "Invalid"
        | "";
      damageItem?: string;
      victimLocation?: MatchWorldPosition;
      playerLocations?: MatchPlayerLocation[];
    }
  | {
      eventType: "spike_planted";
      timeSinceRoundStartMillis: number;
      planterPuuid: string;
      plantLocation?: MatchWorldPosition;
      plantPlayerLocations?: MatchPlayerLocation[];
    }
  | {
      eventType: "spike_defused";
      timeSinceRoundStartMillis: number;
      defuserPuuid: string;
      defuseLocation?: MatchWorldPosition;
      defusePlayerLocations?: MatchPlayerLocation[];
    }
  | {
      eventType: "spike_exploded";
      timeSinceRoundStartMillis: number;
    };

export type RoundSummaryLite = {
  roundNumber: number;
  winningTeam: string;
  roundResultCode: string;
  scoreAfterRound: {
    red: number;
    blue: number;
  };
  playerStats: RoundPlayerStatsLite[];
  eventLog: RoundEventLogEntry[];
};

export type MatchPlayerSummary = {
  puuid: string;
  gameName: string;
  tagLine: string;
  teamId: string;
  characterId: string;
  characterName: string;
};

export type MatchSummaryResponse = {
  matchId: string;
  mapId: string;
  mapName: string;
  queueLabel: string;
  gameStartAt: string;
  viewer: {
    puuid: string;
    bestRoundNumber: number;
  } | null;
  totalRounds: number;
  players: MatchPlayerSummary[];
  rounds: RoundSummaryLite[];
};

export type MatchQueueFilter = "All" | "Competitive" | "Unrated" | "Custom";

export type MatchPreviewPagination = {
  start: number;
  limit: number;
  total: number;
  hasMore: boolean;
  nextStart?: number | null;
};

export type MatchPreviewsResponse = {
  matches: MatchPreview[];
  pagination: MatchPreviewPagination;
};
