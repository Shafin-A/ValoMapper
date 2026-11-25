import { AGENTS } from "@/lib/consts";
import type { AgentRole } from "@/lib/types";
import { getReplayPlayerStateAtTime } from "../frames";
import type { ReplayFrame, ReplayFramePlayer, ReplayRound } from "../types";
import { REPLAY_PREFIX } from "./constants";

export const getReplayAgentId = (playerIndex: number) =>
  `${REPLAY_PREFIX}agent-${playerIndex}`;

export const getReplayAgentRole = (agentName: string): AgentRole =>
  AGENTS.find((agent) => agent.name === agentName)?.role ?? "Duelist";

export const getFramePlayer = (frame: ReplayFrame, puuid: string) =>
  frame.players.find((player) => player.puuid === puuid);

/**
 * Alive players come from the interpolated frame. Dead players are absent from
 * the movement samples after death, so fall back to their last round sample.
 */
export const getReplayPlayerState = (
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

export const getRoundPlanterPuuid = (round: ReplayRound) => {
  const plantEvent = round.eventLog.find(
    (event) => event.eventType === "spike_planted",
  );

  return plantEvent?.eventType === "spike_planted"
    ? plantEvent.planterPuuid
    : null;
};
