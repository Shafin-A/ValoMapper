import "fake-indexeddb/auto";

import { getReplay, listReplayMeta, putReplay } from "@/lib/replay/idb";
import type { ReplayMatch } from "@/lib/replay/types";

const DB_NAME = "valomapper-replays";

const openLegacyDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore("replays", { keyPath: "replayId" });
      database.createObjectStore("meta", { keyPath: "replayId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const writeLegacyRecord = (database: IDBDatabase, replayId: string) =>
  new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      ["replays", "meta"],
      "readwrite",
    );
    transaction.objectStore("replays").put({
      replayId,
      match: { replayId, rounds: [] },
    });
    transaction.objectStore("meta").put({
      replayId,
      savedAt: Date.now(),
      sequence: 1,
      bytes: 20,
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

const buildMatch = (replayId: string): ReplayMatch =>
  ({
    matchId: replayId,
    mapId: "lotus",
    mapName: "Lotus",
    queueLabel: "Replay",
    gameStartAt: "",
    totalRounds: 0,
    players: [],
    rounds: [],
    replayId,
  }) as unknown as ReplayMatch;

describe("IndexedDB schema upgrade", () => {
  it("discards records written with the previous schema", async () => {
    const legacyDatabase = await openLegacyDatabase();
    await writeLegacyRecord(legacyDatabase, "legacy");
    legacyDatabase.close();

    expect(await getReplay("legacy")).toBeNull();
    expect(await listReplayMeta()).toEqual([]);

    expect(await putReplay("fresh", buildMatch("fresh"))).toBe(true);
    expect(await getReplay("fresh")).not.toBeNull();

    const meta = await listReplayMeta();
    expect(meta).toHaveLength(1);
    expect(meta[0].replayId).toBe("fresh");
    expect(meta[0].schemaVersion).toBe(2);
  });
});
