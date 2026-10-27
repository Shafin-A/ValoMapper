import { restoreReplayFrames, stripReplayFrames } from "./frames";
import { deleteReplay, getReplay, putReplay } from "./idb";
import { MockReplayDataSource } from "./mock-source";
import type { ReplayLoadOptions, ReplayMatch } from "./types";
import { fetchReplayById } from "./vrf-source";

export const DEMO_REPLAY_ID = "demo";

const memoryStore = new Map<string, ReplayMatch>();

const createReplayId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `replay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const isRealReplay = (match: ReplayMatch) => match.source === "vrf";

/**
 * A demo match is cheap to rebuild from its seed, so its frames are stripped
 * before storage. A real VRF match has no seed: its frames are the parse result
 * and must survive the round trip.
 */
const toStoredMatch = (match: ReplayMatch) =>
  isRealReplay(match) ? match : stripReplayFrames(match);

const fromStoredMatch = (match: ReplayMatch) =>
  isRealReplay(match) ? match : restoreReplayFrames(match);

export const saveReplaySession = async (
  match: ReplayMatch,
  replayId = match.replayId ?? createReplayId(),
) => {
  memoryStore.set(replayId, match);

  // IndexedDB is best-effort: the memory copy keeps the current tab working
  // when storage is unavailable or over quota.
  await putReplay(replayId, toStoredMatch(match));

  return replayId;
};

export const getReplaySession = async (
  replayId: string,
  options?: ReplayLoadOptions,
): Promise<ReplayMatch | null> => {
  const memoryMatch = memoryStore.get(replayId);
  if (memoryMatch) {
    return memoryMatch;
  }

  const storedMatch = await getReplay(replayId);
  if (storedMatch) {
    const restored = fromStoredMatch(storedMatch);
    memoryStore.set(replayId, restored);
    return restored;
  }

  if (replayId === DEMO_REPLAY_ID) {
    const demo = await new MockReplayDataSource().loadDemo(options);
    await saveReplaySession(demo, DEMO_REPLAY_ID);
    return demo;
  }

  // Reload fallback: the server keeps a short-TTL copy. A 404 means it expired.
  const remoteMatch = await fetchReplayById(replayId, options);
  if (remoteMatch) {
    memoryStore.set(replayId, remoteMatch);
    await putReplay(replayId, toStoredMatch(remoteMatch));
    return remoteMatch;
  }

  return null;
};

export const clearReplaySession = async (replayId: string) => {
  memoryStore.delete(replayId);
  await deleteReplay(replayId);
};
