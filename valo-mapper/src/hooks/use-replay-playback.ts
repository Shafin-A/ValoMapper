"use client";

import { createReplayClock } from "@/lib/replay/clock";
import { useCallback, useEffect, useRef, useState } from "react";

export const REPLAY_SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

export const REPLAY_SEEK_STEP_MS = 5_000;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
};

export const useReplayPlayback = ({
  durationMs,
  resetKey,
  startTimeMs = 0,
}: {
  durationMs: number;
  resetKey: string | number;
  /**
   * Where playback begins and where it resets to. Seeking is still allowed
   * across the whole round.
   */
  startTimeMs?: number;
}) => {
  const start = clamp(startTimeMs, 0, durationMs);
  const startRef = useRef(start);
  startRef.current = start;
  const activeStartRef = useRef(start);

  const clockRef = useRef<ReturnType<typeof createReplayClock> | null>(null);
  if (!clockRef.current) {
    clockRef.current = createReplayClock(start);
  }
  const clock = clockRef.current;

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);

  const frameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const seek = useCallback(
    (timeMs: number, options?: { pause?: boolean }) => {
      clock.setTime(clamp(timeMs, 0, durationMs));

      if (options?.pause ?? true) {
        setIsPlaying(false);
      }
    },
    [clock, durationMs],
  );

  const seekRelative = useCallback(
    (deltaMs: number) => {
      seek(clock.getTime() + deltaMs, { pause: false });
    },
    [clock, seek],
  );

  const togglePlay = useCallback(() => {
    if (clock.getTime() >= durationMs) {
      clock.setTime(activeStartRef.current);
      setIsPlaying(true);
      return;
    }

    setIsPlaying((previous) => !previous);
  }, [clock, durationMs]);

  const cycleSpeed = useCallback((direction: -1 | 1) => {
    setSpeed((previous) => {
      const index = REPLAY_SPEEDS.indexOf(previous);
      const nextIndex = clamp(index + direction, 0, REPLAY_SPEEDS.length - 1);
      return REPLAY_SPEEDS[nextIndex];
    });
  }, []);

  useEffect(() => {
    const nextStart = startRef.current;
    activeStartRef.current = nextStart;
    clock.setTime(nextStart);
    setIsPlaying(false);
  }, [clock, resetKey]);

  useEffect(() => {
    if (!isPlaying) {
      lastTimestampRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }

      const deltaMs = (timestamp - lastTimestampRef.current) * speed;
      lastTimestampRef.current = timestamp;

      const nextTime = Math.min(durationMs, clock.getTime() + deltaMs);
      clock.setTime(nextTime);

      if (nextTime >= durationMs) {
        setIsPlaying(false);
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastTimestampRef.current = null;
    };
  }, [clock, durationMs, isPlaying, speed]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        togglePlay();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekRelative(-REPLAY_SEEK_STEP_MS);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        seekRelative(REPLAY_SEEK_STEP_MS);
        return;
      }

      if (event.key === ",") {
        event.preventDefault();
        cycleSpeed(-1);
        return;
      }

      if (event.key === ".") {
        event.preventDefault();
        cycleSpeed(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cycleSpeed, seekRelative, togglePlay]);

  return {
    clock,
    getCurrentTimeMs: clock.getTime,
    isPlaying,
    speed,
    seek,
    seekRelative,
    setSpeed,
    cycleSpeed,
    togglePlay,
  };
};
