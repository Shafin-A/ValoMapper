import { restoreReplayFrames, stripReplayFrames } from "./frames";
import { MockReplayDataSource } from "./mock-source";
import type { ReplayLoadOptions, ReplayMatch } from "./types";
import { fetchReplayById } from "./vrf-source";

export const DEMO_REPLAY_ID = "demo";

const STORAGE_PREFIX = "valo-replay-session:";

const memoryStore = new Map<string, ReplayMatch>();

const canUseSessionStorage = () =>
  typeof window !== "undefined" && typeof sessionStorage !== "undefined";

const createReplayId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `replay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const isRealReplay = (match: ReplayMatch) => match.source === "vrf";

const readStoredReplay = (replayId: string): ReplayMatch | null => {
  if (!canUseSessionStorage()) {
    return null;
  }

  const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${replayId}`);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ReplayMatch;
    // Real VRF frames are authoritative; never regenerate or drop them.
    return isRealReplay(parsed) ? parsed : restoreReplayFrames(parsed);
  } catch {
    return null;
  }
};

const writeStoredReplay = (replayId: string, match: ReplayMatch) => {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    // Real matches keep their frames: M0 has one frame per round, and a stripped
    // real match cannot be regenerated. Demo matches are still stripped because
    // their frames are deterministic followers of the seed.
    sessionStorage.setItem(
      `${STORAGE_PREFIX}${replayId}`,
      JSON.stringify(isRealReplay(match) ? match : stripReplayFrames(match)),
    );
  } catch {
    // Session storage can be unavailable (private mode / quota). The in-memory
    // copy above still keeps the player working for the current tab, and the
    // server cache remains the reload fallback for real replays.
  }
};

export const saveReplaySession = (
  match: ReplayMatch,
  replayId = match.replayId ?? createReplayId(),
) => {
  memoryStore.set(replayId, match);
  writeStoredReplay(replayId, match);
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

  const storedMatch = readStoredReplay(replayId);
  if (storedMatch) {
    memoryStore.set(replayId, storedMatch);
    return storedMatch;
  }

  if (replayId === DEMO_REPLAY_ID) {
    const demo = await new MockReplayDataSource().loadDemo(options);
    saveReplaySession(demo, DEMO_REPLAY_ID);
    return demo;
  }

  // Reload fallback: the server keeps a short-TTL copy. A 404 means it expired.
  const remoteMatch = await fetchReplayById(replayId, options);
  if (remoteMatch) {
    memoryStore.set(replayId, remoteMatch);
    writeStoredReplay(replayId, remoteMatch);
    return remoteMatch;
  }

  return null;
};

export const clearReplaySession = (replayId: string) => {
  memoryStore.delete(replayId);

  if (canUseSessionStorage()) {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${replayId}`);
  }
};
