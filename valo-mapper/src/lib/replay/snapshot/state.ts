import { defaultIconSettings } from "@/contexts/settings-context";
import { createEmptyPhaseState } from "@/lib/canvas-phase";
import { resolveMatchMapOption } from "@/lib/match-review";
import type { MapOption, MapSide, PhaseState, UndoableState } from "@/lib/types";
import type { ReplayFrame, ReplayMatch, ReplayRound } from "../types";
import { buildReplayAgents, buildReplayVisionCones } from "./agents";
import { REPLAY_PREFIX } from "./constants";
import { buildLatestKillLine } from "./kill-line";
import { buildReplaySpike } from "./spike";
import { buildReplayUtilities } from "./utilities";
import { buildReplayWeapons } from "./weapons";

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
