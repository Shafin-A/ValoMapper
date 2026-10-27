export type PendingLobbyToast =
  | { type: "created" }
  | { type: "review-copy"; roundNumber: number; matchId?: string }
  | {
      type: "replay-save";
      roundNumber: number;
      timeMs: number;
      replayId: string;
    };

export const PENDING_LOBBY_TOAST_STORAGE_KEY = "pendingLobbyToast";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const setPendingLobbyToast = (pendingToast: PendingLobbyToast) => {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(
    PENDING_LOBBY_TOAST_STORAGE_KEY,
    JSON.stringify(pendingToast),
  );
};

export const readPendingLobbyToast = (): PendingLobbyToast | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawPendingToast = sessionStorage.getItem(
    PENDING_LOBBY_TOAST_STORAGE_KEY,
  );
  if (!rawPendingToast) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawPendingToast) as unknown;
    if (!isRecord(parsed) || typeof parsed.type !== "string") {
      return null;
    }

    if (parsed.type === "created") {
      return { type: "created" };
    }

    if (
      parsed.type === "review-copy" &&
      typeof parsed.roundNumber === "number"
    ) {
      return {
        type: "review-copy",
        roundNumber: parsed.roundNumber,
        matchId:
          typeof parsed.matchId === "string" ? parsed.matchId : undefined,
      };
    }

    if (
      parsed.type === "replay-save" &&
      typeof parsed.roundNumber === "number" &&
      typeof parsed.timeMs === "number" &&
      typeof parsed.replayId === "string"
    ) {
      return {
        type: "replay-save",
        roundNumber: parsed.roundNumber,
        timeMs: parsed.timeMs,
        replayId: parsed.replayId,
      };
    }
  } catch {
    return null;
  }

  return null;
};

export const clearPendingLobbyToast = () => {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(PENDING_LOBBY_TOAST_STORAGE_KEY);
};
