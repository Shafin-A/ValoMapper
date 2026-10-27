import type { ReplayMatch } from "./types";

/**
 * IndexedDB is the primary reload path for parsed replays. A real match is
 * 20–40 MB of JSON, which sessionStorage cannot hold, so a quota failure here
 * must degrade gracefully instead of losing the current session.
 */
const DB_NAME = "valomapper-replays";
const DB_VERSION = 1;
const REPLAYS_STORE = "replays";
const META_STORE = "meta";

/** Keep the newest few matches; older ones are pruned before a write. */
export const MAX_STORED_REPLAYS = 3;
export const MAX_STORED_BYTES = 96 * 1024 * 1024;

export type StoredReplayMeta = {
  replayId: string;
  savedAt: number;
  /** Monotonic tie-breaker so same-millisecond writes keep their order. */
  sequence: number;
  /** Serialized size estimate, used only for pruning. */
  bytes: number;
};

let writeSequence = 0;

const canUseIndexedDb = () =>
  typeof window !== "undefined" && typeof indexedDB !== "undefined";

let databasePromise: Promise<IDBDatabase | null> | null = null;

const openDatabase = () => {
  if (!canUseIndexedDb()) {
    return Promise.resolve<IDBDatabase | null>(null);
  }
  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise<IDBDatabase | null>((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;
      const existing = Array.from(database.objectStoreNames);
      if (!existing.includes(REPLAYS_STORE)) {
        database.createObjectStore(REPLAYS_STORE, { keyPath: "replayId" });
      }
      if (!existing.includes(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "replayId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      resolve(null);
    };
    request.onblocked = () => {
      databasePromise = null;
      resolve(null);
    };
  });

  return databasePromise;
};

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

const isQuotaError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (error as { name?: string }).name === "QuotaExceededError";

export const listReplayMeta = async (): Promise<StoredReplayMeta[]> => {
  const database = await openDatabase();
  if (!database) {
    return [];
  }

  try {
    const transaction = database.transaction(META_STORE, "readonly");
    const entries = await requestResult(
      transaction.objectStore(META_STORE).getAll(),
    );
    return (entries as StoredReplayMeta[]).sort(
      (a, b) => a.savedAt - b.savedAt || a.sequence - b.sequence,
    );
  } catch {
    return [];
  }
};

/** Delete the oldest stored matches until the policy fits. */
export const pruneReplays = async () => {
  const entries = await listReplayMeta();
  let totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  let count = entries.length;

  for (const entry of entries) {
    if (count <= 1) {
      break;
    }
    if (count <= MAX_STORED_REPLAYS && totalBytes <= MAX_STORED_BYTES) {
      break;
    }
    await deleteReplay(entry.replayId);
    count -= 1;
    totalBytes -= entry.bytes;
  }
};

const writeReplay = async (
  database: IDBDatabase,
  replayId: string,
  match: ReplayMatch,
  bytes: number,
) => {
  const transaction = database.transaction(
    [REPLAYS_STORE, META_STORE],
    "readwrite",
  );
  transaction.objectStore(REPLAYS_STORE).put({ replayId, match });
  transaction.objectStore(META_STORE).put({
    replayId,
    savedAt: Date.now(),
    sequence: ++writeSequence,
    bytes,
  } satisfies StoredReplayMeta);
  await transactionDone(transaction);
};

/**
 * Store a parsed match. On a quota failure the oldest entry is dropped and the
 * write is retried once; if it still fails the caller keeps its memory copy.
 */
export const putReplay = async (
  replayId: string,
  match: ReplayMatch,
): Promise<boolean> => {
  const database = await openDatabase();
  if (!database) {
    return false;
  }

  const bytes = JSON.stringify(match).length;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await writeReplay(database, replayId, match, bytes);
      await pruneReplays();
      return true;
    } catch (error) {
      if (!isQuotaError(error) || attempt > 0) {
        return false;
      }
      const entries = await listReplayMeta();
      const oldest = entries.find((entry) => entry.replayId !== replayId);
      if (!oldest) {
        return false;
      }
      await deleteReplay(oldest.replayId);
    }
  }

  return false;
};

export const getReplay = async (
  replayId: string,
): Promise<ReplayMatch | null> => {
  const database = await openDatabase();
  if (!database) {
    return null;
  }

  try {
    const transaction = database.transaction(REPLAYS_STORE, "readonly");
    const stored = await requestResult(
      transaction.objectStore(REPLAYS_STORE).get(replayId),
    );
    if (!stored) {
      return null;
    }
    return (stored as { match: ReplayMatch }).match ?? null;
  } catch {
    return null;
  }
};

export const deleteReplay = async (replayId: string) => {
  const database = await openDatabase();
  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(
      [REPLAYS_STORE, META_STORE],
      "readwrite",
    );
    transaction.objectStore(REPLAYS_STORE).delete(replayId);
    transaction.objectStore(META_STORE).delete(replayId);
    await transactionDone(transaction);
  } catch {
    // A failed delete must never break the player.
  }
};

export const clearReplays = async () => {
  const database = await openDatabase();
  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(
      [REPLAYS_STORE, META_STORE],
      "readwrite",
    );
    transaction.objectStore(REPLAYS_STORE).clear();
    transaction.objectStore(META_STORE).clear();
    await transactionDone(transaction);
  } catch {
    // Ignore: the next read simply misses.
  }
};
