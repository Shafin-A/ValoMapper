import type {
  ReplayUtility,
  ReplayUtilityLengthSample,
  ReplayUtilityPositionSample,
  ReplayUtilityVisionSample,
} from "./types";

export const REPLAY_UTILITY_MAX_SAMPLE_AGE_MS = 250;

export const getReplaySmokeLifetimeProgress = (
  utility: ReplayUtility,
  timeMs: number,
): number | undefined => {
  if (utility.kind !== "smoke" || utility.inactive) {
    return undefined;
  }
  const duration = utility.endTimeMs - utility.startTimeMs;
  if (duration <= 0) {
    return undefined;
  }
  return Math.min(1, Math.max(0, (timeMs - utility.startTimeMs) / duration));
};

export const getReplayUtilityPositionAtTime = (
  utility: ReplayUtility,
  timeMs: number,
): ReplayUtilityPositionSample | { x: number; y: number } | null => {
  if (timeMs < utility.startTimeMs || timeMs >= utility.endTimeMs) {
    return null;
  }
  if (utility.kind !== "mobile") {
    const samples = utility.samples;
    if (!samples?.length) {
      return utility.position;
    }
    if (timeMs <= samples[0].timeMs) {
      return samples[0];
    }
    for (let index = 1; index < samples.length; index += 1) {
      const next = samples[index];
      if (timeMs <= next.timeMs) {
        const previous = samples[index - 1];
        const span = next.timeMs - previous.timeMs;
        if (span <= 0) {
          return next;
        }
        const progress = (timeMs - previous.timeMs) / span;
        return {
          x: previous.x + (next.x - previous.x) * progress,
          y: previous.y + (next.y - previous.y) * progress,
        };
      }
    }
    return samples[samples.length - 1];
  }

  let latest: ReplayUtilityPositionSample | undefined;
  for (const sample of utility.samples ?? []) {
    if (sample.timeMs > timeMs) {
      break;
    }
    latest = sample;
  }
  if (!latest || timeMs - latest.timeMs > REPLAY_UTILITY_MAX_SAMPLE_AGE_MS) {
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

export const getReplayUtilityLengthAtTime = (
  utility: ReplayUtility,
  timeMs: number,
): number | undefined => {
  const samples = utility.lengthSamples;
  if (!samples?.length) {
    return utility.length;
  }
  if (timeMs < samples[0].timeMs) {
    return 0;
  }

  let previous: ReplayUtilityLengthSample = samples[0];
  for (const sample of samples) {
    if (sample.timeMs <= timeMs) {
      previous = sample;
      continue;
    }
    const span = sample.timeMs - previous.timeMs;
    if (span <= 0) {
      return sample.length;
    }
    const progress = (timeMs - previous.timeMs) / span;
    return previous.length + (sample.length - previous.length) * progress;
  }
  return previous.length;
};

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
  return (((previous.yaw + delta * progress) % 360) + 360) % 360;
};
