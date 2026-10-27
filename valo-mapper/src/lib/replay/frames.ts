import type {
  MatchPlayerLocation,
  MatchPlayerSummary,
  RoundEventLogEntry,
} from "@/lib/types";
import type {
  ReplayFrame,
  ReplayFramePlayer,
  ReplayMatch,
  ReplayRound,
  ReplaySeed,
  ReplaySeedRound,
  ReplaySpikeState,
} from "./types";

export const REPLAY_FRAME_INTERVAL_MS = 500;

/**
 * Longest gap between two movement samples the player will interpolate across.
 * A longer gap means the stream lost the player (death, off-map, reconnect), so
 * the pose is shown at the sample and the player is hidden until the next one
 * instead of sliding across the map.
 */
export const REPLAY_MAX_INTERPOLATION_GAP_MS = 500;

const FALLBACK_WORLD_CENTER = { x: 7_000, y: 4_500 };
const SPAWN_OFFSET = 700;

type WorldPoint = { x: number; y: number };

type SnapshotLocation = {
  x: number;
  y: number;
  viewRadians: number;
};

type ReplaySnapshot = {
  timeMs: number;
  locations: Map<string, SnapshotLocation>;
  spike: ReplayFrame["spike"];
};

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

const cloneSpike = (spike: ReplayFrame["spike"]): ReplayFrame["spike"] =>
  spike ? { x: spike.x, y: spike.y, state: spike.state } : null;

const cloneLocations = (locations: Map<string, SnapshotLocation>) =>
  new Map(
    Array.from(locations.entries()).map(([puuid, location]) => [
      puuid,
      { ...location },
    ]),
  );

const getEventLocations = (
  event: RoundEventLogEntry,
): MatchPlayerLocation[] => {
  switch (event.eventType) {
    case "kill":
      return event.playerLocations ?? [];
    case "spike_planted":
      return event.plantPlayerLocations ?? [];
    case "spike_defused":
      return event.defusePlayerLocations ?? [];
    default:
      return [];
  }
};

const getEventVictimLocation = (event: RoundEventLogEntry) => {
  if (event.eventType !== "kill") {
    return null;
  }

  return event.victimLocation ?? null;
};

const getPlanterPuuid = (round: ReplaySeedRound) => {
  const plantEvent = round.eventLog.find(
    (event) => event.eventType === "spike_planted",
  );

  return plantEvent?.eventType === "spike_planted"
    ? plantEvent.planterPuuid
    : null;
};

const getFinalSpikeState = (
  round: ReplaySeedRound,
): ReplaySpikeState | null => {
  if (round.roundResultCode === "Detonate") {
    return "detonated";
  }

  if (round.roundResultCode === "Defuse") {
    return "defused";
  }

  return null;
};

const getDeathTimes = (round: ReplaySeedRound) => {
  const deathTimes = new Map<string, number>();

  for (const event of round.eventLog) {
    if (event.eventType === "kill" && !deathTimes.has(event.victimPuuid)) {
      deathTimes.set(event.victimPuuid, event.timeSinceRoundStartMillis);
    }
  }

  return deathTimes;
};

const buildSnapshots = (
  round: ReplaySeedRound,
  players: MatchPlayerSummary[],
): { snapshots: ReplaySnapshot[]; planterPuuid: string | null } => {
  const firstLocations = new Map<string, SnapshotLocation>();

  const rememberFirstLocation = (
    puuid: string,
    location: WorldPoint,
    viewRadians = 0,
  ) => {
    if (firstLocations.has(puuid)) {
      return;
    }

    firstLocations.set(puuid, { ...location, viewRadians });
  };

  for (const event of round.eventLog) {
    for (const location of getEventLocations(event)) {
      rememberFirstLocation(
        location.puuid,
        location.location,
        location.viewRadians,
      );
    }

    const victimLocation = getEventVictimLocation(event);
    if (event.eventType === "kill" && victimLocation) {
      rememberFirstLocation(event.victimPuuid, victimLocation);
    }
  }

  const knownLocations = Array.from(firstLocations.values());
  const worldCenter =
    knownLocations.length > 0
      ? {
          x:
            knownLocations.reduce((sum, location) => sum + location.x, 0) /
            knownLocations.length,
          y:
            knownLocations.reduce((sum, location) => sum + location.y, 0) /
            knownLocations.length,
        }
      : FALLBACK_WORLD_CENTER;

  const runningLocations = new Map<string, SnapshotLocation>();

  players.forEach((player, index) => {
    const firstLocation = firstLocations.get(player.puuid);

    if (firstLocation) {
      const dx = firstLocation.x - worldCenter.x;
      const dy = firstLocation.y - worldCenter.y;
      const length = Math.hypot(dx, dy) || 1;

      runningLocations.set(player.puuid, {
        x: firstLocation.x + (dx / length) * SPAWN_OFFSET,
        y: firstLocation.y + (dy / length) * SPAWN_OFFSET,
        viewRadians: firstLocation.viewRadians,
      });
      return;
    }

    const angle = (index / Math.max(1, players.length)) * Math.PI * 2;
    runningLocations.set(player.puuid, {
      x: worldCenter.x + Math.cos(angle) * SPAWN_OFFSET,
      y: worldCenter.y + Math.sin(angle) * SPAWN_OFFSET,
      viewRadians: 0,
    });
  });

  const planterPuuid = getPlanterPuuid(round);
  const snapshots: ReplaySnapshot[] = [];
  let spike: ReplayFrame["spike"] = null;

  const updateSpikeWhileCarried = () => {
    if (!planterPuuid) {
      return;
    }

    const planterLocation = runningLocations.get(planterPuuid);
    if (planterLocation) {
      spike = {
        x: planterLocation.x,
        y: planterLocation.y,
        state: "carried",
      };
    }
  };

  updateSpikeWhileCarried();
  snapshots.push({
    timeMs: 0,
    locations: cloneLocations(runningLocations),
    spike: cloneSpike(spike),
  });

  for (const event of round.eventLog) {
    for (const location of getEventLocations(event)) {
      runningLocations.set(location.puuid, {
        x: location.location.x,
        y: location.location.y,
        viewRadians: location.viewRadians,
      });
    }

    const victimLocation = getEventVictimLocation(event);
    if (event.eventType === "kill" && victimLocation) {
      const previousLocation = runningLocations.get(event.victimPuuid);
      runningLocations.set(event.victimPuuid, {
        x: victimLocation.x,
        y: victimLocation.y,
        viewRadians: previousLocation?.viewRadians ?? 0,
      });
    }

    if (event.eventType === "spike_planted" && event.plantLocation) {
      spike = {
        x: event.plantLocation.x,
        y: event.plantLocation.y,
        state: "planted",
      };
    }

    if (event.eventType === "spike_defused") {
      const defuseLocation: WorldPoint | undefined =
        event.defuseLocation ??
        (spike ? { x: spike.x, y: spike.y } : undefined);

      if (defuseLocation) {
        spike = {
          x: defuseLocation.x,
          y: defuseLocation.y,
          state: "defused",
        };
      }
    }

    snapshots.push({
      timeMs: event.timeSinceRoundStartMillis,
      locations: cloneLocations(runningLocations),
      spike: cloneSpike(spike),
    });
  }

  const finalSpikeState = getFinalSpikeState(round);
  if (spike && finalSpikeState) {
    spike = { ...spike, state: finalSpikeState };
  }

  snapshots.push({
    timeMs: round.durationMs,
    locations: cloneLocations(runningLocations),
    spike: cloneSpike(spike),
  });

  return { snapshots, planterPuuid };
};

const findSnapshotPair = (snapshots: ReplaySnapshot[], timeMs: number) => {
  if (snapshots.length === 0) {
    return null;
  }

  if (timeMs <= snapshots[0].timeMs) {
    return { previous: snapshots[0], next: snapshots[0], progress: 0 };
  }

  const lastSnapshot = snapshots[snapshots.length - 1];
  if (timeMs >= lastSnapshot.timeMs) {
    return { previous: lastSnapshot, next: lastSnapshot, progress: 0 };
  }

  let low = 0;
  let high = snapshots.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (snapshots[middle].timeMs <= timeMs) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const previous = snapshots[Math.max(0, high)];
  const next = snapshots[Math.min(snapshots.length - 1, low)];
  const span = next.timeMs - previous.timeMs;

  return {
    previous,
    next,
    progress: span > 0 ? (timeMs - previous.timeMs) / span : 0,
  };
};

const interpolateSpike = (
  previous: ReplaySnapshot,
  next: ReplaySnapshot,
  progress: number,
) => {
  if (!previous.spike) {
    return next.spike ? { ...next.spike } : null;
  }

  if (!next.spike || next.spike.state !== previous.spike.state) {
    return { ...previous.spike };
  }

  return {
    x: lerp(previous.spike.x, next.spike.x, progress),
    y: lerp(previous.spike.y, next.spike.y, progress),
    state: previous.spike.state,
  };
};

export const buildReplayFrames = (
  round: ReplaySeedRound,
  players: MatchPlayerSummary[],
): ReplayFrame[] => {
  const { snapshots } = buildSnapshots(round, players);
  const deathTimes = getDeathTimes(round);
  const playerStatsByPuuid = new Map(
    round.playerStats.map((playerStats) => [playerStats.puuid, playerStats]),
  );

  const frames: ReplayFrame[] = [];
  const frameCount = Math.ceil(round.durationMs / REPLAY_FRAME_INTERVAL_MS);

  for (let index = 0; index <= frameCount; index += 1) {
    const timeMs = Math.min(
      round.durationMs,
      index * REPLAY_FRAME_INTERVAL_MS,
    );
    const pair = findSnapshotPair(snapshots, timeMs);
    if (!pair) {
      break;
    }

    const { previous, next, progress } = pair;
    const progressRatio = clamp(timeMs / Math.max(1, round.durationMs), 0, 1);

    const framePlayers: ReplayFramePlayer[] = players.map((player) => {
      const previousLocation =
        previous.locations.get(player.puuid) ??
        next.locations.get(player.puuid);
      const nextLocation =
        next.locations.get(player.puuid) ?? previousLocation;

      const x =
        previousLocation && nextLocation
          ? lerp(previousLocation.x, nextLocation.x, progress)
          : FALLBACK_WORLD_CENTER.x;
      const y =
        previousLocation && nextLocation
          ? lerp(previousLocation.y, nextLocation.y, progress)
          : FALLBACK_WORLD_CENTER.y;

      const playerStats = playerStatsByPuuid.get(player.puuid);
      const deathTime = deathTimes.get(player.puuid);
      const alive = deathTime === undefined || timeMs < deathTime;

      let hp: number;
      if (!alive) {
        hp = 0;
      } else if (deathTime !== undefined) {
        const deathProgress = clamp(timeMs / Math.max(1, deathTime), 0, 1);
        hp = Math.max(1, Math.round(100 * (1 - deathProgress)));
      } else {
        hp = Math.max(
          1,
          Math.round(
            100 -
              (playerStats?.incomingDamage ?? 0) * 0.5 * progressRatio,
          ),
        );
      }

      return {
        puuid: player.puuid,
        x,
        y,
        viewRadians:
          previousLocation?.viewRadians ?? nextLocation?.viewRadians ?? 0,
        hp,
        credits: playerStats?.economy.remaining ?? 0,
        weaponId: playerStats?.weaponId,
        armorId: playerStats?.armorId,
        alive,
      };
    });

    frames.push({
      timeMs,
      players: framePlayers,
      spike: interpolateSpike(previous, next, progress),
    });
  }

  return frames;
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

  return {
    timeMs: clampedTime,
    players,
    spike:
      canInterpolate &&
      previous.spike &&
      next.spike &&
      previous.spike.state === next.spike.state
        ? {
            x: lerp(previous.spike.x, next.spike.x, progress),
            y: lerp(previous.spike.y, next.spike.y, progress),
            state: previous.spike.state,
          }
        : previous.spike,
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

export const buildReplayMatchFromSeed = (seed: ReplaySeed): ReplayMatch => {
  const players: MatchPlayerSummary[] = seed.players.map((player) => ({
    ...player,
    characterId: "",
  }));

  const rounds: ReplayRound[] = seed.rounds.map((round) => ({
    ...round,
    frames: buildReplayFrames(round, players),
  }));

  return {
    matchId: seed.matchId,
    mapId: seed.mapId,
    mapName: seed.mapName,
    queueLabel: seed.queueLabel,
    gameStartAt: seed.gameStartAt,
    totalRounds: seed.totalRounds,
    players,
    viewer: seed.viewer,
    rounds,
  };
};

export const stripReplayFrames = (match: ReplayMatch): ReplayMatch => ({
  ...match,
  rounds: match.rounds.map((round) => ({
    ...round,
    frames: [],
  })),
});

export const restoreReplayFrames = (match: ReplayMatch): ReplayMatch => {
  // A real VRF match owns its frames. Regenerating them from event locations
  // would replace decoded movement with the mock heuristic.
  if (match.source === "vrf") {
    return match;
  }

  if (match.rounds.every((round) => round.frames.length > 0)) {
    return match;
  }

  return {
    ...match,
    rounds: match.rounds.map((round) => ({
      ...round,
      frames:
        round.frames.length > 0
          ? round.frames
          : buildReplayFrames(round, match.players),
    })),
  };
};
