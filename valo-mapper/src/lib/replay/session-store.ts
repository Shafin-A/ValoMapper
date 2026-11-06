import { deleteReplay, getReplay, putReplay } from "./idb";
import { DemoReplayDataSource } from "./demo-source";
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

export const saveReplaySession = async (
  match: ReplayMatch,
  replayId = match.replayId ?? createReplayId(),
) => {
  memoryStore.set(replayId, match);

  // Drop older demos and re-fetch the asset instead of storing ~20 MB.
  if (replayId === DEMO_REPLAY_ID && match.source === "demo") {
    await deleteReplay(replayId);
    return replayId;
  }

  // IndexedDB is best-effort: the memory copy keeps the current tab working
  // when storage is unavailable or over quota.
  await putReplay(replayId, match);

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
    if (replayId !== DEMO_REPLAY_ID || storedMatch.source === "demo") {
      memoryStore.set(replayId, storedMatch);
      return storedMatch;
    }

    // Drop the old generated demo so the baked asset replaces it.
    await deleteReplay(replayId);
  }

  if (replayId === DEMO_REPLAY_ID) {
    const demo = await new DemoReplayDataSource().loadDemo(options);
    await saveReplaySession(demo, DEMO_REPLAY_ID);
    return demo;
  }

  // Reload fallback: the server keeps a short-TTL copy. A 404 means it expired.
  const remoteMatch = await fetchReplayById(replayId, options);
  if (remoteMatch) {
    memoryStore.set(replayId, remoteMatch);
    await putReplay(replayId, remoteMatch);
    return remoteMatch;
  }

  return null;
};

export const clearReplaySession = async (replayId: string) => {
  memoryStore.delete(replayId);
  await deleteReplay(replayId);
};
