import type {
  ReplayUtility,
  ReplayUtilityPositionSample,
  ReplayUtilityVisionSample,
} from "./types";

export const REPLAY_UTILITY_MAX_SAMPLE_AGE_MS = 250;

export const getReplayUtilityPositionAtTime = (
  utility: ReplayUtility,
  timeMs: number,
): ReplayUtilityPositionSample | { x: number; y: number } | null => {
  if (timeMs < utility.startTimeMs || timeMs >= utility.endTimeMs) {
    return null;
  }
  if (utility.kind !== "mobile") {
    return utility.position;
  }

  let latest: ReplayUtilityPositionSample | undefined;
  for (const sample of utility.samples ?? []) {
    if (sample.timeMs > timeMs) {
      break;
    }
    latest = sample;
  }
  if (
    !latest ||
    timeMs - latest.timeMs > REPLAY_UTILITY_MAX_SAMPLE_AGE_MS
  ) {
    return null;
  }
  return latest;
};

export const getReplayUtilityTrailAtTime = (
  utility: ReplayUtility,
  timeMs: number,
) =>
  (utility.samples ?? []).filter(
    (sample) =>
      sample.timeMs >= utility.startTimeMs &&
      sample.timeMs <= timeMs &&
      sample.timeMs < utility.endTimeMs,
  );

export const getReplayUtilityPathAtTime = (
  utility: ReplayUtility,
  timeMs: number,
) =>
  (utility.path ?? []).filter(
    (sample) =>
      sample.timeMs >= utility.startTimeMs &&
      sample.timeMs <= timeMs &&
      sample.timeMs < utility.endTimeMs,
  );

export const getReplayUtilityVisionYawAtTime = (
  samples: ReplayUtilityVisionSample[] | undefined,
  timeMs: number,
): number | null => {
  if (!samples?.length) {
    return null;
  }

  let previous: ReplayUtilityVisionSample | undefined;
  let next: ReplayUtilityVisionSample | undefined;
  for (const sample of samples) {
    if (sample.timeMs <= timeMs) {
      previous = sample;
      continue;
    }
    next = sample;
    break;
  }
  if (!previous?.active) {
    return null;
  }
  if (!next?.active || next.timeMs <= previous.timeMs) {
    return previous.yaw;
  }

  const delta = ((((next.yaw - previous.yaw) % 360) + 540) % 360) - 180;
  const progress = (timeMs - previous.timeMs) / (next.timeMs - previous.timeMs);
  return ((previous.yaw + delta * progress) % 360 + 360) % 360;
};
