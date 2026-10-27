"use client";

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
}: {
  durationMs: number;
  resetKey: string | number;
}) => {
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);

  const timeRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const seek = useCallback(
    (timeMs: number, options?: { pause?: boolean }) => {
      const nextTime = clamp(timeMs, 0, durationMs);
      timeRef.current = nextTime;
      setCurrentTimeMs(nextTime);

      if (options?.pause ?? true) {
        setIsPlaying(false);
      }
    },
    [durationMs],
  );

  const seekRelative = useCallback(
    (deltaMs: number) => {
      seek(timeRef.current + deltaMs);
    },
    [seek],
  );

  const togglePlay = useCallback(() => {
    if (timeRef.current >= durationMs) {
      timeRef.current = 0;
      setCurrentTimeMs(0);
      setIsPlaying(true);
      return;
    }

    setIsPlaying((previous) => !previous);
  }, [durationMs]);

  const cycleSpeed = useCallback((direction: -1 | 1) => {
    setSpeed((previous) => {
      const index = REPLAY_SPEEDS.indexOf(previous);
      const nextIndex = clamp(
        index + direction,
        0,
        REPLAY_SPEEDS.length - 1,
      );
      return REPLAY_SPEEDS[nextIndex];
    });
  }, []);

  useEffect(() => {
    timeRef.current = 0;
    setCurrentTimeMs(0);
    setIsPlaying(false);
  }, [resetKey]);

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

      const nextTime = Math.min(durationMs, timeRef.current + deltaMs);
      timeRef.current = nextTime;
      setCurrentTimeMs(nextTime);

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
  }, [durationMs, isPlaying, speed]);

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
    currentTimeMs,
    isPlaying,
    speed,
    seek,
    seekRelative,
    setSpeed,
    cycleSpeed,
    togglePlay,
  };
};
