import type {
  ReplayFrame,
  ReplayFramePlayer,
  ReplayRound,
} from "./types";

/**
 * Longest gap between two movement samples the player will interpolate across.
 * A longer gap means the stream lost the player (death, off-map, reconnect), so
 * the pose is shown at the sample and the player is hidden until the next one
 * instead of sliding across the map.
 */
export const REPLAY_MAX_INTERPOLATION_GAP_MS = 500;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

/** Interpolate angles the short way across the 0/2π seam. */
const lerpAngle = (from: number, to: number, progress: number) => {
  const fullTurn = Math.PI * 2;
  let delta = (to - from) % fullTurn;
  if (delta > Math.PI) {
    delta -= fullTurn;
  } else if (delta < -Math.PI) {
    delta += fullTurn;
  }
  return from + delta * progress;
};

export const getReplayFrameAtTime = (
  round: ReplayRound,
  timeMs: number,
): ReplayFrame | null => {
  const frames = round.frames;
  if (frames.length === 0) {
    return null;
  }

  const clampedTime = clamp(timeMs, 0, round.durationMs);

  // Before the round's first frame no player has a sample yet. Returning the
  // first frame here would draw everyone at their first pose, so the timeline is
  // empty until movement starts.
  if (clampedTime < frames[0].timeMs) {
    return { timeMs: clampedTime, players: [], spike: null };
  }

  let low = 0;
  let high = frames.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (frames[middle].timeMs <= clampedTime) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const previous = frames[Math.max(0, high)];
  const next = frames[Math.min(frames.length - 1, low)];

  if (previous === next) {
    return previous;
  }

  const span = next.timeMs - previous.timeMs;
  const progress = span > 0 ? (clampedTime - previous.timeMs) / span : 0;
  const canInterpolate = span <= REPLAY_MAX_INTERPOLATION_GAP_MS;

  // Union both frames: a sample can appear in one and not the other after a
  // reconnect, a death or an off-map excursion.
  const previousByPuuid = new Map(
    previous.players.map((player) => [player.puuid, player]),
  );
  const nextByPuuid = new Map(
    next.players.map((player) => [player.puuid, player]),
  );

  const order = previous.players.map((player) => player.puuid);
  for (const player of next.players) {
    if (!previousByPuuid.has(player.puuid)) {
      order.push(player.puuid);
    }
  }

  const players: ReplayFramePlayer[] = [];
  for (const puuid of order) {
    const priorPlayer = previousByPuuid.get(puuid);
    const upcomingPlayer = nextByPuuid.get(puuid);

    // First sample for this player: do not draw them before it.
    if (!priorPlayer) {
      continue;
    }

    // Last sample for this player, or a gap too long to trust: show the pose
    // only at the sample itself, then hide until movement resumes.
    if (!upcomingPlayer || !canInterpolate) {
      if (clampedTime <= previous.timeMs) {
        players.push(priorPlayer);
      }
      continue;
    }

    players.push({
      ...priorPlayer,
      x: lerp(priorPlayer.x, upcomingPlayer.x, progress),
      y: lerp(priorPlayer.y, upcomingPlayer.y, progress),
      viewRadians: lerpAngle(
        priorPlayer.viewRadians,
        upcomingPlayer.viewRadians,
        progress,
      ),
    });
  }

  let spike = previous.spike ? { ...previous.spike } : null;
  if (
    canInterpolate &&
    previous.spike &&
    next.spike &&
    previous.spike.state === next.spike.state &&
    previous.spike.carrierPuuid === next.spike.carrierPuuid
  ) {
    spike = {
      ...previous.spike,
      x: lerp(previous.spike.x, next.spike.x, progress),
      y: lerp(previous.spike.y, next.spike.y, progress),
    };
  }

  return {
    timeMs: clampedTime,
    players,
    spike,
  };
};

const playerFrameIndexes = new WeakMap<
  ReplayRound,
  Map<string, number[]>
>();

/**
 * Index the frames a player appears in so a state lookup can binary-search
 * that player's samples instead of walking every frame.
 */
const getPlayerFrameIndexes = (round: ReplayRound) => {
  const cached = playerFrameIndexes.get(round);
  if (cached) {
    return cached;
  }

  const indexes = new Map<string, number[]>();
  round.frames.forEach((frame, frameIndex) => {
    for (const player of frame.players) {
      const playerIndexes = indexes.get(player.puuid);
      if (playerIndexes) {
        playerIndexes.push(frameIndex);
      } else {
        indexes.set(player.puuid, [frameIndex]);
      }
    }
  });

  playerFrameIndexes.set(round, indexes);
  return indexes;
};

/**
 * Latest state sample for a player at or before `timeMs`, scoped to one round.
 * A dead player stops appearing in movement frames, so their last sample must
 * be looked up by time rather than by frame membership. Returns `null` when the
 * player has no sample in this round at all.
 */
export const getReplayPlayerStateAtTime = (
  round: ReplayRound,
  puuid: string,
  timeMs: number,
): ReplayFramePlayer | null => {
  const indexes = getPlayerFrameIndexes(round).get(puuid);
  if (!indexes || indexes.length === 0) {
    return null;
  }

  const clampedTime = clamp(timeMs, 0, round.durationMs);
  let low = 0;
  let high = indexes.length - 1;
  let latestIndex = -1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const frameIndex = indexes[middle];

    if (round.frames[frameIndex].timeMs <= clampedTime) {
      latestIndex = frameIndex;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  if (latestIndex < 0) {
    return null;
  }

  return (
    round.frames[latestIndex].players.find((player) => player.puuid === puuid) ??
    null
  );
};

export const getActiveEventIndex = (
  round: Pick<ReplayRound, "eventLog">,
  timeMs: number,
) => {
  let activeIndex: number | null = null;

  round.eventLog.forEach((event, index) => {
    if (event.timeSinceRoundStartMillis <= timeMs) {
      activeIndex = index;
    }
  });

  return activeIndex;
};
