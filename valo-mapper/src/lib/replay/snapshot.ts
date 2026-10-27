import {
  AGENTS,
  getMapCallouts,
  MAP_SIZE,
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
} from "@/lib/consts";
import {
  CANVAS_MAP_RENDER_SCALE,
  transformRiotWorldToCanvasPoint,
} from "@/lib/map-positioning";
import { resolveMatchMapOption } from "@/lib/match-review";
import type {
  AbilityCanvas,
  AgentCanvas,
  AgentRole,
  ConnectingLine,
  MapOption,
  MapSide,
  MatchPlayerSummary,
  PhaseState,
  ToolIconCanvas,
  UndoableState,
} from "@/lib/types";
import type { ReplayFrame, ReplayMatch, ReplayRound } from "./types";

const REPLAY_SPIKE_SIZE = 32;
const REPLAY_VIEW_VECTOR_LENGTH = 100;
const REPLAY_VISION_CONE_NAME = "Vision Cone 103";
const REPLAY_PREFIX = "replay-";

const createEmptyPhaseState = (): PhaseState => ({
  agentsOnCanvas: [],
  abilitiesOnCanvas: [],
  drawLines: [],
  connectingLines: [],
  textsOnCanvas: [],
  imagesOnCanvas: [],
  toolIconsOnCanvas: [],
});

/**
 * A clean canvas for the replay route: fixed map/side, one empty phase.
 * Drawings made by the user land in this phase and are preserved by playback.
 */
export const buildReplayInitialState = ({
  selectedMap,
  agentsSettings,
  abilitiesSettings,
  mapSide = "defense",
}: {
  selectedMap: MapOption;
  agentsSettings?: UndoableState["agentsSettings"];
  abilitiesSettings?: UndoableState["abilitiesSettings"];
  mapSide?: MapSide;
}): UndoableState => ({
  phases: [createEmptyPhaseState()],
  selectedMap,
  mapSide,
  currentPhaseIndex: 0,
  editedPhases: [],
  agentsSettings,
  abilitiesSettings,
});

export const getReplayMapPosition = () => ({
  x: (VIRTUAL_WIDTH - MAP_SIZE) / 2,
  y: (VIRTUAL_HEIGHT - MAP_SIZE) / 2,
});

/** Extra canvas units an icon may overhang the map image before it is hidden. */
export const REPLAY_MAP_ICON_MARGIN = 24;

/**
 * True when a canvas point lands on the rendered map image. Used to hide actors
 * whose world position is outside the playable map (the Iso kill-contract arena
 * and out-of-bounds spawns) rather than freezing or drawing them off-map.
 */
export const isReplayPointOnMap = ({
  point,
  mapPosition = getReplayMapPosition(),
  margin = REPLAY_MAP_ICON_MARGIN,
}: {
  point: { x: number; y: number };
  mapPosition?: { x: number; y: number };
  margin?: number;
}) => {
  const centerX = mapPosition.x + MAP_SIZE / 2;
  const centerY = mapPosition.y + MAP_SIZE / 2;
  const halfExtent = (MAP_SIZE * CANVAS_MAP_RENDER_SCALE) / 2 + margin;

  return (
    Math.abs(point.x - centerX) <= halfExtent &&
    Math.abs(point.y - centerY) <= halfExtent
  );
};

export const getReplayAgentId = (playerIndex: number) =>
  `${REPLAY_PREFIX}agent-${playerIndex}`;

export const getReplayAgentRole = (agentName: string): AgentRole =>
  AGENTS.find((agent) => agent.name === agentName)?.role ?? "Duelist";

/**
 * Agent-name labels for the scoreboard. Duplicate agents are numbered in
 * roster order: `Jett 1`, `Jett 2`, otherwise just `Jett`.
 */
export const getReplayAgentLabels = (players: MatchPlayerSummary[]) => {
  const counts = new Map<string, number>();
  for (const player of players) {
    counts.set(player.characterName, (counts.get(player.characterName) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  const labels = new Map<string, string>();

  for (const player of players) {
    const total = counts.get(player.characterName) ?? 0;
    const index = (seen.get(player.characterName) ?? 0) + 1;
    seen.set(player.characterName, index);

    labels.set(
      player.puuid,
      total > 1 ? `${player.characterName} ${index}` : player.characterName,
    );
  }

  return labels;
};

export const toReplayCanvasPoint = ({
  mapId,
  mapSide,
  position,
}: {
  mapId: string;
  mapSide: MapSide;
  position?: { x: number; y: number };
}) => {
  if (!position) {
    return null;
  }

  const transform = getMapCallouts(mapId);
  if (!transform) {
    return null;
  }

  return transformRiotWorldToCanvasPoint({
    position,
    transform,
    mapPosition: getReplayMapPosition(),
    mapSide,
  });
};

export const toReplayCanvasRotation = ({
  mapId,
  mapSide,
  location,
  viewRadians,
}: {
  mapId: string;
  mapSide: MapSide;
  location?: { x: number; y: number };
  viewRadians?: number;
}) => {
  if (
    !location ||
    typeof viewRadians !== "number" ||
    !Number.isFinite(viewRadians)
  ) {
    return 0;
  }

  const transform = getMapCallouts(mapId);
  if (!transform) {
    return 0;
  }

  const mapPosition = getReplayMapPosition();
  const origin = transformRiotWorldToCanvasPoint({
    position: location,
    transform,
    mapPosition,
    mapSide,
  });
  const facingPoint = transformRiotWorldToCanvasPoint({
    position: {
      x: location.x + Math.cos(viewRadians) * REPLAY_VIEW_VECTOR_LENGTH,
      y: location.y + Math.sin(viewRadians) * REPLAY_VIEW_VECTOR_LENGTH,
    },
    transform,
    mapPosition,
    mapSide,
  });

  if (!origin || !facingPoint) {
    return 0;
  }

  return (
    (Math.atan2(facingPoint.y - origin.y, facingPoint.x - origin.x) * 180) /
    Math.PI
  );
};

const getFramePlayer = (frame: ReplayFrame, puuid: string) =>
  frame.players.find((player) => player.puuid === puuid);

const buildReplayAgents = ({
  match,
  frame,
  mapSide,
}: {
  match: ReplayMatch;
  frame: ReplayFrame;
  mapSide: MapSide;
}): AgentCanvas[] => {
  return match.players.flatMap((player, index) => {
    const framePlayer = getFramePlayer(frame, player.puuid);
    if (!framePlayer) {
      return [];
    }

    const point = toReplayCanvasPoint({
      mapId: match.mapId,
      mapSide,
      position: { x: framePlayer.x, y: framePlayer.y },
    });

    if (!point || !isReplayPointOnMap({ point })) {
      return [];
    }

    return [
      {
        id: getReplayAgentId(index),
        name: player.characterName,
        role: getReplayAgentRole(player.characterName),
        isAlly: player.teamId === "Blue",
        isGray: !framePlayer.alive,
        x: point.x,
        y: point.y,
      },
    ];
  });
};

const buildReplayVisionCones = ({
  match,
  frame,
  mapSide,
}: {
  match: ReplayMatch;
  frame: ReplayFrame;
  mapSide: MapSide;
}): AbilityCanvas[] => {
  return match.players.flatMap((player, index) => {
    const framePlayer = getFramePlayer(frame, player.puuid);
    if (!framePlayer || !framePlayer.alive) {
      return [];
    }

    const point = toReplayCanvasPoint({
      mapId: match.mapId,
      mapSide,
      position: { x: framePlayer.x, y: framePlayer.y },
    });

    if (!point || !isReplayPointOnMap({ point })) {
      return [];
    }

    const agentId = getReplayAgentId(index);

    return [
      {
        id: `${agentId}-cone`,
        name: REPLAY_VISION_CONE_NAME,
        action: "vision_cone_103",
        attachedToId: agentId,
        isAlly: player.teamId === "Blue",
        x: point.x,
        y: point.y,
        currentRotation: toReplayCanvasRotation({
          mapId: match.mapId,
          mapSide,
          location: { x: framePlayer.x, y: framePlayer.y },
          viewRadians: framePlayer.viewRadians,
        }),
        iconOnly: false,
        showOuterCircle: true,
      },
    ];
  });
};

const buildReplaySpike = ({
  match,
  round,
  frame,
  mapSide,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
}): ToolIconCanvas | null => {
  if (!frame.spike) {
    return null;
  }

  const point = toReplayCanvasPoint({
    mapId: match.mapId,
    mapSide,
    position: frame.spike,
  });

  if (!point) {
    return null;
  }

  return {
    id: `${REPLAY_PREFIX}spike-${round.roundNumber}`,
    name: "spike",
    x: point.x,
    y: point.y,
    width: REPLAY_SPIKE_SIZE,
    height: REPLAY_SPIKE_SIZE,
  };
};

const buildLatestKillLine = ({
  match,
  round,
  frame,
  mapSide,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
}): ConnectingLine | null => {
  let latestKillIndex = -1;

  round.eventLog.forEach((event, index) => {
    if (
      event.eventType === "kill" &&
      event.timeSinceRoundStartMillis <= frame.timeMs
    ) {
      latestKillIndex = index;
    }
  });

  if (latestKillIndex < 0) {
    return null;
  }

  const event = round.eventLog[latestKillIndex];
  if (event.eventType !== "kill" || !event.victimLocation) {
    return null;
  }

  const killerIndex = match.players.findIndex(
    (player) => player.puuid === event.killerPuuid,
  );
  const victimIndex = match.players.findIndex(
    (player) => player.puuid === event.victimPuuid,
  );

  if (killerIndex < 0 || victimIndex < 0) {
    return null;
  }

  const killerFramePlayer = getFramePlayer(frame, event.killerPuuid);
  const start = killerFramePlayer
    ? toReplayCanvasPoint({
        mapId: match.mapId,
        mapSide,
        position: { x: killerFramePlayer.x, y: killerFramePlayer.y },
      })
    : null;
  const end = toReplayCanvasPoint({
    mapId: match.mapId,
    mapSide,
    position: event.victimLocation,
  });

  if (!start || !end) {
    return null;
  }

  const killer = match.players[killerIndex];

  return {
    id: `${REPLAY_PREFIX}kill-${round.roundNumber}-${latestKillIndex}`,
    fromId: getReplayAgentId(killerIndex),
    toId: getReplayAgentId(victimIndex),
    strokeColor: killer.teamId === "Blue" ? "#42EEC7" : "#FF4655",
    strokeWidth: 3,
    isInteractive: false,
  };
};

const withoutReplayEntities = (phase: PhaseState): PhaseState => ({
  ...phase,
  agentsOnCanvas: phase.agentsOnCanvas.filter(
    (agent) => !agent.id.startsWith(REPLAY_PREFIX),
  ),
  abilitiesOnCanvas: phase.abilitiesOnCanvas.filter(
    (ability) => !ability.id.startsWith(REPLAY_PREFIX),
  ),
  connectingLines: phase.connectingLines.filter(
    (line) => !line.id.startsWith(REPLAY_PREFIX),
  ),
  toolIconsOnCanvas: phase.toolIconsOnCanvas.filter(
    (toolIcon) => !toolIcon.id.startsWith(REPLAY_PREFIX),
  ),
});

export const buildReplaySnapshotState = ({
  match,
  round,
  frame,
  currentState,
  mapSide = "defense",
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  currentState: UndoableState;
  mapSide?: MapSide;
}): UndoableState => {
  const currentPhase =
    currentState.phases[currentState.currentPhaseIndex] ??
    createEmptyPhaseState();
  const preservedPhase = withoutReplayEntities(currentPhase);

  const replayAgents = buildReplayAgents({ match, frame, mapSide });
  const replayAbilities = buildReplayVisionCones({ match, frame, mapSide });
  const replaySpike = buildReplaySpike({ match, round, frame, mapSide });
  const latestKillLine = buildLatestKillLine({
    match,
    round,
    frame,
    mapSide,
  });

  const mergedPhase: PhaseState = {
    ...preservedPhase,
    agentsOnCanvas: [...preservedPhase.agentsOnCanvas, ...replayAgents],
    abilitiesOnCanvas: [...preservedPhase.abilitiesOnCanvas, ...replayAbilities],
    toolIconsOnCanvas: replaySpike
      ? [...preservedPhase.toolIconsOnCanvas, replaySpike]
      : preservedPhase.toolIconsOnCanvas,
    connectingLines: latestKillLine
      ? [...preservedPhase.connectingLines, latestKillLine]
      : preservedPhase.connectingLines,
  };

  return {
    phases: [mergedPhase],
    selectedMap: currentState.selectedMap,
    mapSide: currentState.mapSide,
    currentPhaseIndex: 0,
    editedPhases: [0],
    agentsSettings: currentState.agentsSettings,
    abilitiesSettings: currentState.abilitiesSettings,
  };
};

export const getReplayMapOption = (match: ReplayMatch) =>
  resolveMatchMapOption(match);
