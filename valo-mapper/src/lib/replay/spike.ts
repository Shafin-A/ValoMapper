import type { ReplayRound } from "./types";

export const REPLAY_SPIKE_TIMER_MS = 45_000;

export const getReplaySpikeTimerProgress = (
  round: ReplayRound,
  currentTimeMs: number,
  planted: boolean,
): number | undefined => {
  if (!planted) {
    return undefined;
  }

  const plant = round.eventLog.find(
    (event) => event.eventType === "spike_planted",
  );
  if (!plant) {
    return undefined;
  }
  const explode = round.eventLog.find(
    (event) => event.eventType === "spike_exploded",
  );
  const start = plant.timeSinceRoundStartMillis;
  const end = explode
    ? explode.timeSinceRoundStartMillis
    : start + REPLAY_SPIKE_TIMER_MS;
  if (end <= start) {
    return undefined;
  }
  return Math.min(1, Math.max(0, (currentTimeMs - start) / (end - start)));
};
