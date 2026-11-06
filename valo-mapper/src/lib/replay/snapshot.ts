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
import { defaultIconSettings } from "@/contexts/settings-context";
import { getToolIconAttachmentPosition } from "@/lib/tool-icon";
import { mToPixels } from "@/lib/utils";
import { VISION_CONE_MAX_LENGTH } from "@/lib/vision-cone-utils";
import type {
  AbilityCanvas,
  AgentCanvas,
  AgentRole,
  ConnectingLine,
  IconSettings,
  MapOption,
  MapSide,
  PhaseState,
  ToolIconCanvas,
  UndoableState,
} from "@/lib/types";
import { getReplayPlayerStateAtTime } from "./frames";
import {
  getReplayAbilityYawOffset,
  getReplayUtilityAbilityIcon,
  getReplayWeaponIcon,
} from "./display";
import {
  getReplayUtilityLengthAtTime,
  getReplayUtilityPathAtTime,
  getReplayUtilityPositionAtTime,
  getReplayUtilityVisionYawAtTime,
} from "./utilities";
import type {
  ReplayFrame,
  ReplayFramePlayer,
  ReplayMatch,
  ReplayRound,
} from "./types";

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

/**
 * Alive players come from the interpolated frame. Dead players are absent from
 * the movement samples after death, so fall back to their last round sample.
 */
const getReplayPlayerState = (
  round: ReplayRound,
  frame: ReplayFrame,
  puuid: string,
): ReplayFramePlayer | null => {
  const current = getFramePlayer(frame, puuid);
  if (current) {
    return current;
  }

  const latest = getReplayPlayerStateAtTime(round, puuid, frame.timeMs);
  return latest && !latest.alive ? latest : null;
};

const getRoundPlanterPuuid = (round: ReplayRound) => {
  const plantEvent = round.eventLog.find(
    (event) => event.eventType === "spike_planted",
  );

  return plantEvent?.eventType === "spike_planted"
    ? plantEvent.planterPuuid
    : null;
};

const buildReplayAgents = ({
  match,
  round,
  frame,
  mapSide,
  hideDeadAgents,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
  hideDeadAgents: boolean;
}): AgentCanvas[] => {
  return match.players.flatMap((player, index) => {
    const framePlayer = getReplayPlayerState(round, frame, player.puuid);
    if (!framePlayer || (hideDeadAgents && !framePlayer.alive)) {
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
  round,
  frame,
  mapSide,
  showVisionCones,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
  showVisionCones: boolean;
}): AbilityCanvas[] => {
  if (!showVisionCones) {
    return [];
  }

  return match.players.flatMap((player, index) => {
    const framePlayer = getReplayPlayerState(round, frame, player.puuid);
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
        currentLength: VISION_CONE_MAX_LENGTH,
        iconOnly: false,
        showOuterCircle: true,
      },
    ];
  });
};

const buildReplayUtilities = ({
  match,
  round,
  frame,
  mapSide,
  showUtilities,
  showVisionCones,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
  showUtilities: boolean;
  showVisionCones: boolean;
}): AbilityCanvas[] => {
  if (!showUtilities) {
    return [];
  }

  return (round.utilities ?? []).flatMap((utility) => {
    const position = getReplayUtilityPositionAtTime(utility, frame.timeMs);
    if (!position) {
      return [];
    }

    const point = toReplayCanvasPoint({
      mapId: match.mapId,
      mapSide,
      position,
    });
    if (!point || !isReplayPointOnMap({ point })) {
      return [];
    }

    const abilityIcon = getReplayUtilityAbilityIcon(utility.abilityId);
    if (!abilityIcon) {
      return [];
    }

    const owner = utility.ownerPuuid
      ? match.players.find((player) => player.puuid === utility.ownerPuuid)
      : undefined;
    const isAlly = owner?.teamId === "Blue";
    const currentPath = getReplayUtilityPathAtTime(utility, frame.timeMs)
      .map((sample) =>
        toReplayCanvasPoint({
          mapId: match.mapId,
          mapSide,
          position: sample,
        }),
      )
      .filter((sample): sample is { x: number; y: number } => sample !== null)
      .map((sample) => ({
        x: sample.x - point.x,
        y: sample.y - point.y,
      }));
    const length = getReplayUtilityLengthAtTime(utility, frame.timeMs);
    const yawOffset = getReplayAbilityYawOffset(abilityIcon.lobbyAction);
    const rotation =
      yawOffset !== null &&
      typeof utility.yaw === "number" &&
      Number.isFinite(utility.yaw)
        ? toReplayCanvasRotation({
            mapId: match.mapId,
            mapSide,
            location: utility.position,
            viewRadians: (utility.yaw * Math.PI) / 180,
          }) + yawOffset
        : undefined;

    const id = `${REPLAY_PREFIX}ability-${round.roundNumber}-${utility.id}`;
    const abilities: AbilityCanvas[] = [
      {
        id,
        name: abilityIcon.name,
        action: abilityIcon.lobbyAction,
        isAlly,
        x: point.x,
        y: point.y,
        currentRotation: rotation,
        currentPath: currentPath.length > 1 ? currentPath : undefined,
        currentLength:
          length !== undefined
            ? mToPixels(length + (utility.abilityId === "trapwire" ? 2 : 0))
            : undefined,
        iconOnly: utility.iconOnly || undefined,
      },
    ];

    const visionYaw =
      showVisionCones && utility.abilityId === "spycam"
        ? getReplayUtilityVisionYawAtTime(utility.vision, frame.timeMs)
        : null;
    if (visionYaw !== null) {
      abilities.push({
        id: `${id}-vision`,
        name: REPLAY_VISION_CONE_NAME,
        action: "vision_cone_103",
        attachedToId: id,
        isAlly,
        x: point.x,
        y: point.y,
        currentRotation: toReplayCanvasRotation({
          mapId: match.mapId,
          mapSide,
          location: utility.position,
          viewRadians: (visionYaw * Math.PI) / 180,
        }),
        currentLength: VISION_CONE_MAX_LENGTH,
        iconOnly: false,
        showOuterCircle: true,
      });
    }

    return abilities;
  });
};

const buildReplayWeapons = ({
  match,
  round,
  frame,
  mapSide,
  agentsSettings,
  hideAgentWeapons,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
  agentsSettings: IconSettings;
  hideAgentWeapons: boolean;
}): ToolIconCanvas[] => {
  if (hideAgentWeapons) {
    return [];
  }

  return match.players.flatMap((player, index) => {
    const framePlayer = getReplayPlayerState(round, frame, player.puuid);
    if (!framePlayer?.alive) {
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

    const weapon = getReplayWeaponIcon(framePlayer.weaponId);
    if (!weapon) {
      return [];
    }

    const toolIcon: ToolIconCanvas = {
      id: `${REPLAY_PREFIX}weapon-${index}`,
      x: point.x,
      y: point.y,
      ...weapon,
      attachedToId: getReplayAgentId(index),
    };
    const position = getToolIconAttachmentPosition(
      toolIcon,
      point.x,
      point.y,
      agentsSettings,
    );

    return [{ ...toolIcon, ...position }];
  });
};

const buildReplaySpike = ({
  match,
  round,
  frame,
  mapSide,
  agentsSettings,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
  agentsSettings: IconSettings;
}): ToolIconCanvas | null => {
  const spike = frame.spike;
  if (!spike) {
    return null;
  }

  const toolIcon: ToolIconCanvas = {
    id: `${REPLAY_PREFIX}spike-${round.roundNumber}`,
    name: "spike",
    x: 0,
    y: 0,
    width: REPLAY_SPIKE_SIZE,
    height: REPLAY_SPIKE_SIZE,
  };

  if (spike.state === "carried") {
    const carrierPuuid = spike.carrierPuuid ?? getRoundPlanterPuuid(round);
    const carrierIndex = carrierPuuid
      ? match.players.findIndex((player) => player.puuid === carrierPuuid)
      : -1;
    const carrier = carrierPuuid
      ? getReplayPlayerState(round, frame, carrierPuuid)
      : null;

    if (carrierIndex >= 0 && carrier?.alive) {
      const carrierPoint = toReplayCanvasPoint({
        mapId: match.mapId,
        mapSide,
        position: { x: carrier.x, y: carrier.y },
      });

      if (carrierPoint && isReplayPointOnMap({ point: carrierPoint })) {
        const position = getToolIconAttachmentPosition(
          toolIcon,
          carrierPoint.x,
          carrierPoint.y,
          agentsSettings,
        );

        return {
          ...toolIcon,
          ...position,
          attachedToId: getReplayAgentId(carrierIndex),
        };
      }
    }
  }

  const point = toReplayCanvasPoint({
    mapId: match.mapId,
    mapSide,
    position: spike,
  });

  if (!point) {
    return null;
  }

  // Keep the copied lobby consistent with the canvas: off-map spikes are
  // hidden rather than pasted outside the minimap.
  if (!isReplayPointOnMap({ point })) {
    return null;
  }

  return {
    ...toolIcon,
    x: point.x,
    y: point.y,
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
  hideDeadAgents = false,
  hideAgentWeapons = false,
  showVisionCones = true,
  showUtilities = true,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  currentState: UndoableState;
  mapSide?: MapSide;
  hideDeadAgents?: boolean;
  hideAgentWeapons?: boolean;
  showVisionCones?: boolean;
  showUtilities?: boolean;
}): UndoableState => {
  const currentPhase =
    currentState.phases[currentState.currentPhaseIndex] ??
    createEmptyPhaseState();
  const preservedPhase = withoutReplayEntities(currentPhase);
  const agentsSettings = currentState.agentsSettings ?? defaultIconSettings;

  const replayAgents = buildReplayAgents({
    match,
    round,
    frame,
    mapSide,
    hideDeadAgents,
  });
  const replayAbilities = [
    ...buildReplayVisionCones({
      match,
      round,
      frame,
      mapSide,
      showVisionCones,
    }),
    ...buildReplayUtilities({
      match,
      round,
      frame,
      mapSide,
      showUtilities,
      showVisionCones,
    }),
  ];
  const replayWeapons = buildReplayWeapons({
    match,
    round,
    frame,
    mapSide,
    agentsSettings,
    hideAgentWeapons,
  });
  const replaySpike = buildReplaySpike({
    match,
    round,
    frame,
    mapSide,
    agentsSettings,
  });
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
    toolIconsOnCanvas: [
      ...preservedPhase.toolIconsOnCanvas,
      ...replayWeapons,
      ...(replaySpike ? [replaySpike] : []),
    ],
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
