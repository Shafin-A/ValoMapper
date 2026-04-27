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

export type SyncStatus = "idle" | "unsynced" | "syncing" | "synced" | "error";

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

export type ImagePositionData = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CanvasPatchEntry = {
  entity: string;
  action: string;
  phaseIndex: number;
  id?: string;
  payload?: Record<string, unknown>;
};

export type CanvasPatch = {
  entries: CanvasPatchEntry[];
};

export type AgentCanvas = CanvasItem & {
  role: AgentRole;
  isGray?: boolean;
};

export type AbilityCanvas = CanvasItem & {
  action: AbilityAction;
  currentRotation?: number;
  currentLength?: number;
  currentPath?: Vector2d[];
  iconOnly?: boolean;
  showOuterCircle?: boolean;
};

export type AgentRole = "Duelist" | "Controller" | "Initiator" | "Sentinel";

export type EraserSettings = {
  size: number;
  mode: "pixel" | "line";
};

export type DrawShape = "freehand" | "straight" | "rectangle" | "circle";

export type DrawSettings = {
  size: number;
  color: string;
  isDashed: boolean;
  isArrowHead: boolean;
  shape: DrawShape;
  opacity: number;
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
  slot: string;
};

export type AbilityAlternate = {
  id: string;
  src: string;
  name: string;
  action: AbilityAction;
  slot: string;
};

export type AbilityIconDefinition = AbilityIconItem & {
  alternates?: AbilityAlternate[];
};

export type AbilityIconConfig = AbilityIconDefinition[];

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
  | "viper_smoke"
  | "viper_wall"
  | "vyse_slow"
  | "vyse_ult"
  | "vyse_wall"
  | "waylay_slow"
  | "waylay_ult"
  | "vision_cone_30"
  | "vision_cone_60"
  | "vision_cone_90";
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
  shape?: DrawShape;
  opacity?: number;
  parentId?: string;
  chunkIndex?: number;
  totalChunks?: number;
};

export type ConnectingLine = {
  id: string;
  fromId: string;
  toId: string;
  strokeColor: string;
  strokeWidth: number;
  uploadedImages?: string[];
  youtubeLink?: string;
  notes?: string;
  isInteractive?: boolean;
};

export type MapSide = "attack" | "defense";

export type UndoableState = {
  phases: PhaseState[];
  selectedMap: MapOption;
  mapSide: MapSide;
  currentPhaseIndex: number;
  editedPhases: number[];
  agentsSettings?: IconSettings;
  abilitiesSettings?: IconSettings;
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
  connectingLines: ConnectingLine[];
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
  rsoSubjectId?: string | null;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  tourCompleted?: boolean;
  isSubscribed?: boolean;
  personalIsSubscribed?: boolean;
  subscriptionStartedAt?: Date | string | null;
  subscriptionEndedAt?: Date | string | null;
  subscriptionTrialEndsAt?: Date | string | null;
  subscriptionPlan?: "monthly" | "yearly" | "stack" | null;
  personalSubscriptionEndedAt?: Date | string | null;
  personalSubscriptionTrialEndsAt?: Date | string | null;
  personalSubscriptionPlan?: "monthly" | "yearly" | "stack" | null;
  premiumTrialEligible?: boolean;
  premiumTrialDaysLeft?: number;
};

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
  };
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

export type StackMember = {
  id: number;
  ownerUserId: number;
  memberUserId: number;
  status: "pending" | "active";
  invitedAt: Date | string;
  joinedAt?: Date | string | null;
  memberEmail?: string | null;
  memberName?: string | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
};

export type StackOwner = {
  userId: number;
  email?: string | null;
  name?: string | null;
};

export type StackMembersResponse = {
  owner: StackOwner;
  members: StackMember[];
  canManage: boolean;
};

export type ItemType = "agent" | "ability" | "text" | "image" | "tool";

export type Callout = {
  regionName: string;
  superRegionName: string;
  location: Vector2d;
};

export type MapCalloutData = {
  xMultiplier: number;
  yMultiplier: number;
  xScalarToAdd: number;
  yScalarToAdd: number;
  rotation: number;
  callouts: Callout[];
};

export type SpawnBarrier = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isAlly: boolean;
};

export type MapSpawnBarrierData = {
  barriers: SpawnBarrier[];
};
