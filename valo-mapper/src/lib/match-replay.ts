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
  DrawLine,
  ImageCanvas,
  MapOption,
  MapSide,
  MatchPlayerLocation,
  MatchPlayerSummary,
  MatchSummaryResponse,
  PhaseState,
  RoundEventLogEntry,
  RoundSummaryLite,
  UndoableState,
} from "@/lib/types";

const REPLAY_KILL_COLORS = {
  ally: "#34d399",
  enemy: "#fb7185",
} as const;

const REPLAY_SPIKE_SIZE = 40;

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

const flipMapSide = (mapSide: MapSide): MapSide =>
  mapSide === "attack" ? "defense" : "attack";

const inferRoundMapSide = ({
  fallbackSide,
  playersByPuuid,
  round,
  roundNumber,
  viewerTeamId,
}: {
  fallbackSide: MapSide;
  playersByPuuid: Map<string, MatchPlayerSummary>;
  round: RoundSummaryLite;
  roundNumber: number;
  viewerTeamId?: string;
}): MapSide => {
  const plantedEvent = round.eventLog.find(
    (event) => event.eventType === "spike_planted",
  );
  if (plantedEvent?.eventType === "spike_planted") {
    return playersByPuuid.get(plantedEvent.planterPuuid)?.teamId ===
      viewerTeamId
      ? "attack"
      : "defense";
  }

  const defusedEvent = round.eventLog.find(
    (event) => event.eventType === "spike_defused",
  );
  if (defusedEvent?.eventType === "spike_defused") {
    return playersByPuuid.get(defusedEvent.defuserPuuid)?.teamId ===
      viewerTeamId
      ? "defense"
      : "attack";
  }

  if (roundNumber === 13) {
    return flipMapSide(fallbackSide);
  }

  return fallbackSide;
};

const getReplayMapPosition = () => ({
  x: (VIRTUAL_WIDTH - MAP_SIZE) / 2,
  y: (VIRTUAL_HEIGHT - MAP_SIZE) / 2,
});

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

const buildAgentsFromLocations = ({
  latestLocations,
  mapId,
  mapSide,
  players,
  viewerTeamId,
}: {
  latestLocations: Map<string, MatchPlayerLocation>;
  mapId: string;
  mapSide: MapSide;
  players: MatchPlayerSummary[];
  viewerTeamId?: string;
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
        id: `replay-agent-${player.puuid}`,
        name: player.characterName,
        role: getAgentRole(player.characterName),
        isAlly: player.teamId === viewerTeamId,
        x: canvasPoint.x,
        y: canvasPoint.y,
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
  roundNumber,
  viewerTeamId,
}: {
  event: Extract<RoundEventLogEntry, { eventType: "kill" }>;
  latestLocations: Map<string, MatchPlayerLocation>;
  mapId: string;
  mapSide: MapSide;
  playersByPuuid: Map<string, MatchPlayerSummary>;
  roundNumber: number;
  viewerTeamId?: string;
}): DrawLine | null => {
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

  const isAllyKill =
    playersByPuuid.get(event.killerPuuid)?.teamId === viewerTeamId;

  return {
    id: `replay-kill-${roundNumber}-${event.timeSinceRoundStartMillis}-${event.killerPuuid}-${event.victimPuuid}`,
    tool: "pencil",
    points: [start, end],
    color: isAllyKill ? REPLAY_KILL_COLORS.ally : REPLAY_KILL_COLORS.enemy,
    size: 5,
    isDashed: false,
    isArrowHead: true,
    shape: "straight",
    opacity: 0.9,
  };
};

const buildSpikeImage = ({
  location,
  mapId,
  mapSide,
  roundNumber,
}: {
  location?: { x: number; y: number };
  mapId: string;
  mapSide: MapSide;
  roundNumber: number;
}): ImageCanvas | null => {
  const canvasPoint = toCanvasPoint({ mapId, mapSide, position: location });

  if (!canvasPoint) {
    return null;
  }

  return {
    id: `replay-spike-${roundNumber}`,
    src: "/tools/spike.webp",
    x: canvasPoint.x - REPLAY_SPIKE_SIZE / 2,
    y: canvasPoint.y - REPLAY_SPIKE_SIZE / 2,
    width: REPLAY_SPIKE_SIZE,
    height: REPLAY_SPIKE_SIZE,
  };
};

const seedLatestLocations = (
  latestLocations: Map<string, MatchPlayerLocation>,
  event: RoundEventLogEntry,
) => {
  getEventPlayerLocations(event).forEach((playerLocation) => {
    latestLocations.set(playerLocation.puuid, playerLocation);
  });

  if (event.eventType === "kill" && event.victimLocation) {
    latestLocations.set(event.victimPuuid, {
      puuid: event.victimPuuid,
      viewRadians: 0,
      location: event.victimLocation,
    });
  }
};

const buildRoundReplayState = ({
  mapOption,
  mapSide,
  players,
  playersByPuuid,
  round,
  viewerTeamId,
}: {
  mapOption: MapOption;
  mapSide: MapSide;
  players: MatchPlayerSummary[];
  playersByPuuid: Map<string, MatchPlayerSummary>;
  round: RoundSummaryLite;
  viewerTeamId?: string;
}): UndoableState => {
  const latestLocations = new Map<string, MatchPlayerLocation>();
  const firstPositionedEvent = round.eventLog.find(
    (event) => getEventPlayerLocations(event).length > 0,
  );

  if (firstPositionedEvent) {
    seedLatestLocations(latestLocations, firstPositionedEvent);
  }

  const initialPhase = createEmptyPhaseState();
  initialPhase.agentsOnCanvas = buildAgentsFromLocations({
    latestLocations,
    mapId: mapOption.id,
    mapSide,
    players,
    viewerTeamId,
  });

  const phases = [initialPhase];

  round.eventLog.forEach((event) => {
    seedLatestLocations(latestLocations, event);

    const nextPhase = clonePhaseState(phases[phases.length - 1]);
    nextPhase.agentsOnCanvas = buildAgentsFromLocations({
      latestLocations,
      mapId: mapOption.id,
      mapSide,
      players,
      viewerTeamId,
    });

    if (event.eventType === "kill") {
      const killLine = buildKillLine({
        event,
        latestLocations,
        mapId: mapOption.id,
        mapSide,
        playersByPuuid,
        roundNumber: round.roundNumber,
        viewerTeamId,
      });

      if (killLine) {
        nextPhase.drawLines = [
          ...nextPhase.drawLines.filter((line) => line.id !== killLine.id),
          killLine,
        ];
      }
    }

    if (event.eventType === "spike_planted") {
      const spikeImage = buildSpikeImage({
        location: event.plantLocation,
        mapId: mapOption.id,
        mapSide,
        roundNumber: round.roundNumber,
      });

      if (spikeImage) {
        nextPhase.imagesOnCanvas = [
          ...nextPhase.imagesOnCanvas.filter(
            (image) => image.id !== spikeImage.id,
          ),
          spikeImage,
        ];
      }
    }

    if (event.eventType === "spike_defused") {
      const spikeImage = buildSpikeImage({
        location: event.defuseLocation,
        mapId: mapOption.id,
        mapSide,
        roundNumber: round.roundNumber,
      });

      if (spikeImage) {
        nextPhase.imagesOnCanvas = [
          ...nextPhase.imagesOnCanvas.filter(
            (image) => image.id !== spikeImage.id,
          ),
          spikeImage,
        ];
      }
    }

    phases.push(nextPhase);
  });

  return {
    phases,
    selectedMap: mapOption,
    mapSide,
    currentPhaseIndex: 0,
    editedPhases: phases.map((_, index) => index),
  };
};

export const buildMatchReplayRoundStates = (match: MatchSummaryResponse) => {
  const mapOption = resolveReplayMapOption(match);
  const playersByPuuid = new Map(
    match.players.map((player) => [player.puuid, player]),
  );
  const viewerTeamId = playersByPuuid.get(match.viewer.puuid)?.teamId;
  let fallbackSide: MapSide = "defense";

  const roundStates = Object.fromEntries(
    match.rounds.map((round) => {
      const roundSide = inferRoundMapSide({
        fallbackSide,
        playersByPuuid,
        round,
        roundNumber: round.roundNumber,
        viewerTeamId,
      });

      fallbackSide = roundSide;

      return [
        round.roundNumber,
        buildRoundReplayState({
          mapOption,
          mapSide: roundSide,
          players: match.players,
          playersByPuuid,
          round,
          viewerTeamId,
        }),
      ];
    }),
  ) as Record<number, UndoableState>;

  return {
    roundStates,
    viewerTeamId,
  };
};
