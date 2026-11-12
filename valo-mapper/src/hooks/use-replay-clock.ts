import type { ReplayClock } from "@/lib/replay/clock";
import { useSyncExternalStore } from "react";

export const useReplayClockTime = (clock: ReplayClock) =>
  useSyncExternalStore(clock.subscribe, clock.getTime, clock.getTime);

export const useReplayClockStep = (clock: ReplayClock, stepMs: number) => {
  const getSnapshot = () =>
    Math.floor(clock.getTime() / stepMs) * stepMs;

  return useSyncExternalStore(clock.subscribe, getSnapshot, getSnapshot);
};
