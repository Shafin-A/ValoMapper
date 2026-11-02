"use client";

import { getReplayPlayerStateAtTime } from "@/lib/replay/frames";
import type { MapSide } from "@/lib/types";
import type { ReplayHit, ReplayMatch, ReplayRound } from "@/lib/replay/types";
import {
  isReplayPointOnMap,
  toReplayCanvasPoint,
} from "@/lib/replay/snapshot";
import { Line } from "react-konva";

const REPLAY_TRACER_TRAVEL_MS = 120;
const REPLAY_TRACER_TAIL_PX = 50;

const REPLAY_TRACER_COLORS = {
  Blue: "#42EEC7",
  Red: "#FF4655",
} as const;

const getReplayHitPoint = ({
  match,
  round,
  mapSide,
  puuid,
  timeMs,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  mapSide: MapSide;
  puuid: string;
  timeMs: number;
}) => {
  const player = getReplayPlayerStateAtTime(round, puuid, timeMs);
  if (!player) {
    return null;
  }

  const point = toReplayCanvasPoint({
    mapId: match.mapId,
    mapSide,
    position: { x: player.x, y: player.y },
  });
  if (!point || !isReplayPointOnMap({ point })) {
    return null;
  }
  return point;
};

const buildReplayTracer = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  progress: number,
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) {
    return null;
  }

  const ux = dx / distance;
  const uy = dy / distance;
  const head = distance * Math.min(1, Math.max(0, progress));
  const tail = Math.max(0, head - REPLAY_TRACER_TAIL_PX);

  return [
    start.x + ux * tail,
    start.y + uy * tail,
    start.x + ux * head,
    start.y + uy * head,
  ];
};

const isReplayHitActive = (hit: ReplayHit, currentTimeMs: number) =>
  currentTimeMs >= hit.timeMs - REPLAY_TRACER_TRAVEL_MS &&
  currentTimeMs <= hit.timeMs;

export const ReplayHitTracer = ({
  match,
  round,
  hit,
  index,
  mapSide,
  currentTimeMs,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  hit: ReplayHit;
  index: number;
  mapSide: MapSide;
  currentTimeMs: number;
}) => {
  if (!isReplayHitActive(hit, currentTimeMs)) {
    return null;
  }

  const start = getReplayHitPoint({
    match,
    round,
    mapSide,
    puuid: hit.shooterPuuid,
    timeMs: hit.timeMs,
  });
  const end = getReplayHitPoint({
    match,
    round,
    mapSide,
    puuid: hit.victimPuuid,
    timeMs: hit.timeMs,
  });
  if (!start || !end) {
    return null;
  }

  const progress =
    (currentTimeMs - (hit.timeMs - REPLAY_TRACER_TRAVEL_MS)) /
    REPLAY_TRACER_TRAVEL_MS;
  const points = buildReplayTracer(start, end, progress);
  if (!points) {
    return null;
  }

  const shooter = match.players.find(
    (player) => player.puuid === hit.shooterPuuid,
  );
  const tracerColor =
    shooter?.teamId === "Blue"
      ? REPLAY_TRACER_COLORS.Blue
      : REPLAY_TRACER_COLORS.Red;

  return (
    <Line
      key={`replay-tracer-${index}-${hit.timeMs}`}
      id={`replay-tracer-${index}`}
      points={points}
      stroke={tracerColor}
      strokeWidth={2.5}
      opacity={0.9}
      lineCap="round"
      shadowColor={tracerColor}
      shadowBlur={8}
      shadowOpacity={0.7}
      listening={false}
    />
  );
};
