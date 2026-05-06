import {
  AGENTS,
  DEFAULT_MAP_OPTIONS,
  getMapCallouts,
  MAP_OPTIONS,
  MAP_SIZE,
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
} from "@/lib/consts";
import { transformRiotWorldToCanvasPoint } from "@/lib/map-positioning";
import type {
  AgentCanvas,
  AgentRole,
  AbilityCanvas,
  ConnectingLine,
  IconSettings,
  MapOption,
  MapSide,
  MatchPlayerLocation,
  MatchPlayerSummary,
  MatchSummaryResponse,
  PhaseState,
  RoundEventLogEntry,
  RoundSummaryLite,
  ToolIconCanvas,
  UndoableState,
} from "@/lib/types";

const FALLBACK_REPLAY_KILL_COLORS = {
  ally: "#34d399",
  enemy: "#fb7185",
} as const;

const REPLAY_SPIKE_SIZE = 32;
const REPLAY_VIEW_VECTOR_LENGTH = 100;
const REPLAY_VISION_CONE_NAME = "Vision Cone 103";

const createEmptyPhaseState = (): PhaseState => ({
  agentsOnCanvas: [],
  abilitiesOnCanvas: [],
  drawLines: [],
  connectingLines: [],
  textsOnCanvas: [],
  imagesOnCanvas: [],
  toolIconsOnCanvas: [],
});

const normalizeMapKey = (value?: string) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const clonePhaseState = (phase: PhaseState): PhaseState => ({
  agentsOnCanvas: phase.agentsOnCanvas.map((agent) => ({ ...agent })),
  abilitiesOnCanvas: phase.abilitiesOnCanvas.map((ability) => ({ ...ability })),
  drawLines: phase.drawLines.map((line) => ({
    ...line,
    points: line.points.map((point) => ({ ...point })),
  })),
  connectingLines: phase.connectingLines.map((line) => ({
    ...line,
    uploadedImages: line.uploadedImages ? [...line.uploadedImages] : undefined,
  })),
  textsOnCanvas: phase.textsOnCanvas.map((text) => ({ ...text })),
  imagesOnCanvas: phase.imagesOnCanvas.map((image) => ({ ...image })),
  toolIconsOnCanvas: phase.toolIconsOnCanvas.map((icon) => ({ ...icon })),
});

export const cloneUndoableState = (state: UndoableState): UndoableState => ({
  ...state,
  phases: state.phases.map(clonePhaseState),
  editedPhases: [...state.editedPhases],
  agentsSettings: state.agentsSettings
    ? { ...state.agentsSettings }
    : undefined,
  abilitiesSettings: state.abilitiesSettings
    ? { ...state.abilitiesSettings }
    : undefined,
});

const resolveReplayMapOption = (match: MatchSummaryResponse): MapOption => {
  const mapNameKey = normalizeMapKey(match.mapName);
  const mapIdKey = normalizeMapKey(match.mapId.split("/").pop());

  return (
    MAP_OPTIONS.find((option) => {
      const optionIdKey = normalizeMapKey(option.id);
      const optionTextKey = normalizeMapKey(option.text);

      return (
        optionIdKey === mapNameKey ||
        optionTextKey === mapNameKey ||
        optionIdKey === mapIdKey ||
        optionTextKey === mapIdKey
      );
    }) ?? DEFAULT_MAP_OPTIONS[0]
  );
};

const getAgentRole = (agentName: string): AgentRole => {
  return AGENTS.find((agent) => agent.name === agentName)?.role ?? "Duelist";
};

const getEventPlayerLocations = (event: RoundEventLogEntry) => {
  switch (event.eventType) {
    case "kill":
      return event.playerLocations ?? [];
    case "spike_planted":
      return event.plantPlayerLocations ?? [];
    case "spike_defused":
      return event.defusePlayerLocations ?? [];
    default:
      return [];
  }
};

const getReplayMapPosition = () => ({
  x: (VIRTUAL_WIDTH - MAP_SIZE) / 2,
  y: (VIRTUAL_HEIGHT - MAP_SIZE) / 2,
});

const buildReplayAgentIdsByPuuid = (players: MatchPlayerSummary[]) =>
  new Map(
    players.map((player, index) => [player.puuid, `replay-agent-${index}`]),
  );

const getReplayAgentId = (
  replayAgentIdsByPuuid: Map<string, string>,
  puuid: string,
) => replayAgentIdsByPuuid.get(puuid) ?? "replay-agent-unknown";

const toCanvasPoint = ({
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

const toCanvasRotation = ({
  mapId,
  mapSide,
  location,
  viewRadians,
}: {
  mapId: string;
  mapSide: MapSide;
  location?: MatchPlayerLocation["location"];
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

const buildAgentsFromLocations = ({
  latestLocations,
  mapId,
  mapSide,
  players,
  grayPlayerIds,
  replayAgentIdsByPuuid,
}: {
  latestLocations: Map<string, MatchPlayerLocation>;
  mapId: string;
  mapSide: MapSide;
  players: MatchPlayerSummary[];
  grayPlayerIds?: Set<string>;
  replayAgentIdsByPuuid: Map<string, string>;
}): AgentCanvas[] => {
  return players.flatMap((player) => {
    const playerLocation = latestLocations.get(player.puuid);
    const canvasPoint = toCanvasPoint({
      mapId,
      mapSide,
      position: playerLocation?.location,
    });

    if (!canvasPoint) {
      return [];
    }

    return [
      {
        id: getReplayAgentId(replayAgentIdsByPuuid, player.puuid),
        name: player.characterName,
        role: getAgentRole(player.characterName),
        isAlly: player.teamId === "Blue",
        isGray: grayPlayerIds?.has(player.puuid),
        x: canvasPoint.x,
        y: canvasPoint.y,
      },
    ];
  });
};

const buildVisionConesFromLocations = ({
  latestLocations,
  mapId,
  mapSide,
  players,
  replayAgentIdsByPuuid,
}: {
  latestLocations: Map<string, MatchPlayerLocation>;
  mapId: string;
  mapSide: MapSide;
  players: MatchPlayerSummary[];
  replayAgentIdsByPuuid: Map<string, string>;
}): AbilityCanvas[] => {
  return players.flatMap((player) => {
    const playerLocation = latestLocations.get(player.puuid);
    const canvasPoint = toCanvasPoint({
      mapId,
      mapSide,
      position: playerLocation?.location,
    });

    if (!playerLocation || !canvasPoint) {
      return [];
    }

    const agentId = getReplayAgentId(replayAgentIdsByPuuid, player.puuid);

    return [
      {
        id: `${agentId}-cone`,
        name: REPLAY_VISION_CONE_NAME,
        action: "vision_cone_103",
        attachedToId: agentId,
        isAlly: player.teamId === "Blue",
        x: canvasPoint.x,
        y: canvasPoint.y,
        currentRotation: toCanvasRotation({
          mapId,
          mapSide,
          location: playerLocation.location,
          viewRadians: playerLocation.viewRadians,
        }),
        iconOnly: false,
        showOuterCircle: true,
      },
    ];
  });
};

const buildKillLine = ({
  event,
  latestLocations,
  mapId,
  mapSide,
  playersByPuuid,
  replayAgentIdsByPuuid,
  roundNumber,
  eventIndex,
  killColors,
}: {
  event: Extract<RoundEventLogEntry, { eventType: "kill" }>;
  latestLocations: Map<string, MatchPlayerLocation>;
  mapId: string;
  mapSide: MapSide;
  playersByPuuid: Map<string, MatchPlayerSummary>;
  replayAgentIdsByPuuid: Map<string, string>;
  roundNumber: number;
  eventIndex: number;
  killColors: {
    ally: string;
    enemy: string;
  };
}): ConnectingLine | null => {
  const killerLocation = latestLocations.get(event.killerPuuid)?.location;
  const start = toCanvasPoint({ mapId, mapSide, position: killerLocation });
  const end = toCanvasPoint({
    mapId,
    mapSide,
    position: event.victimLocation,
  });

  if (!start || !end) {
    return null;
  }

  const isAllyKill = playersByPuuid.get(event.killerPuuid)?.teamId === "Blue";

  return {
    id: `replay-kill-${roundNumber}-${eventIndex}`,
    fromId: getReplayAgentId(replayAgentIdsByPuuid, event.killerPuuid),
    toId: getReplayAgentId(replayAgentIdsByPuuid, event.victimPuuid),
    strokeColor: isAllyKill ? killColors.ally : killColors.enemy,
    strokeWidth: 3,
    isInteractive: false,
  };
};

const buildSpikeToolIcon = ({
  location,
  mapId,
  mapSide,
  roundNumber,
}: {
  location?: { x: number; y: number };
  mapId: string;
  mapSide: MapSide;
  roundNumber: number;
}): ToolIconCanvas | null => {
  const canvasPoint = toCanvasPoint({ mapId, mapSide, position: location });

  if (!canvasPoint) {
    return null;
  }

  return {
    id: `replay-spike-${roundNumber}`,
    name: "spike",
    x: canvasPoint.x,
    y: canvasPoint.y,
    width: REPLAY_SPIKE_SIZE,
    height: REPLAY_SPIKE_SIZE,
  };
};

const seedLatestLocations = (
  latestLocations: Map<string, MatchPlayerLocation>,
  event: RoundEventLogEntry,
  deadPlayers: Set<string>,
) => {
  getEventPlayerLocations(event).forEach((playerLocation) => {
    const wasDead = deadPlayers.has(playerLocation.puuid);
    latestLocations.set(playerLocation.puuid, playerLocation);

    if (wasDead) {
      deadPlayers.delete(playerLocation.puuid);
    }
  });

  if (event.eventType === "kill" && event.victimLocation) {
    const existingVictimLocation = latestLocations.get(event.victimPuuid);

    latestLocations.set(event.victimPuuid, {
      puuid: event.victimPuuid,
      viewRadians: existingVictimLocation?.viewRadians ?? 0,
      location: event.victimLocation,
    });

    if (deadPlayers.has(event.victimPuuid)) {
      deadPlayers.delete(event.victimPuuid);
    }
  }
};

const buildRoundReplayState = ({
  mapOption,
  mapSide,
  players,
  playersByPuuid,
  replayAgentIdsByPuuid,
  round,
  killColors,
}: {
  mapOption: MapOption;
  mapSide: MapSide;
  players: MatchPlayerSummary[];
  playersByPuuid: Map<string, MatchPlayerSummary>;
  replayAgentIdsByPuuid: Map<string, string>;
  round: RoundSummaryLite;
  killColors: {
    ally: string;
    enemy: string;
  };
}): UndoableState => {
  const latestLocations = new Map<string, MatchPlayerLocation>();
  const deadPlayers = new Set<string>();
  const phases: PhaseState[] = [];
  let plantedSpikeLocation: { x: number; y: number } | null = null;

  round.eventLog.forEach((event, eventIndex) => {
    seedLatestLocations(latestLocations, event, deadPlayers);

    const nextPhase = clonePhaseState(
      phases[phases.length - 1] ?? createEmptyPhaseState(),
    );
    nextPhase.connectingLines = nextPhase.connectingLines.filter(
      (line) => !line.id.startsWith("replay-kill-"),
    );
    nextPhase.agentsOnCanvas = buildAgentsFromLocations({
      latestLocations,
      mapId: mapOption.id,
      mapSide,
      players,
      replayAgentIdsByPuuid,
      grayPlayerIds:
        event.eventType === "kill" ? new Set([event.victimPuuid]) : undefined,
    });
    nextPhase.abilitiesOnCanvas = buildVisionConesFromLocations({
      latestLocations,
      mapId: mapOption.id,
      mapSide,
      players,
      replayAgentIdsByPuuid,
    });

    if (event.eventType === "kill") {
      const killLine = buildKillLine({
        event,
        latestLocations,
        mapId: mapOption.id,
        mapSide,
        playersByPuuid,
        replayAgentIdsByPuuid,
        roundNumber: round.roundNumber,
        eventIndex,
        killColors,
      });

      if (killLine) {
        nextPhase.connectingLines = [
          ...nextPhase.connectingLines.filter(
            (line) => line.id !== killLine.id,
          ),
          killLine,
        ];
      }

      deadPlayers.add(event.victimPuuid);
      latestLocations.delete(event.victimPuuid);
    }

    if (event.eventType === "spike_planted") {
      plantedSpikeLocation = event.plantLocation ?? null;

      const spikeToolIcon = buildSpikeToolIcon({
        location: event.plantLocation,
        mapId: mapOption.id,
        mapSide,
        roundNumber: round.roundNumber,
      });

      if (spikeToolIcon) {
        nextPhase.toolIconsOnCanvas = [
          ...nextPhase.toolIconsOnCanvas.filter(
            (icon) => icon.id !== spikeToolIcon.id,
          ),
          spikeToolIcon,
        ];
      }
    }

    if (event.eventType === "spike_defused") {
      const spikeToolIcon = buildSpikeToolIcon({
        location: plantedSpikeLocation ?? undefined,
        mapId: mapOption.id,
        mapSide,
        roundNumber: round.roundNumber,
      });

      if (spikeToolIcon) {
        nextPhase.toolIconsOnCanvas = [
          ...nextPhase.toolIconsOnCanvas.filter(
            (icon) => icon.id !== spikeToolIcon.id,
          ),
          spikeToolIcon,
        ];
      }
    }

    phases.push(nextPhase);
  });

  if (phases.length === 0) {
    phases.push(createEmptyPhaseState());
  }

  return {
    phases,
    selectedMap: mapOption,
    mapSide,
    currentPhaseIndex: 0,
    editedPhases: phases.map((_, index) => index),
  };
};

export const buildMatchReplayRoundStates = (
  match: MatchSummaryResponse,
  agentsSettings?: IconSettings,
) => {
  const mapOption = resolveReplayMapOption(match);
  const playersByPuuid = new Map(
    match.players.map((player) => [player.puuid, player]),
  );
  const replayAgentIdsByPuuid = buildReplayAgentIdsByPuuid(match.players);
  const viewerTeamId = match.viewer
    ? playersByPuuid.get(match.viewer.puuid)?.teamId
    : undefined;
  const killColors = {
    ally: agentsSettings?.allyColor ?? FALLBACK_REPLAY_KILL_COLORS.ally,
    enemy: agentsSettings?.enemyColor ?? FALLBACK_REPLAY_KILL_COLORS.enemy,
  };

  const roundStates = Object.fromEntries(
    match.rounds.map((round) => [
      round.roundNumber,
      buildRoundReplayState({
        mapOption,
        mapSide: "defense",
        players: match.players,
        playersByPuuid,
        replayAgentIdsByPuuid,
        round,
        killColors,
      }),
    ]),
  ) as Record<number, UndoableState>;

  return {
    roundStates,
    viewerTeamId,
  };
};
