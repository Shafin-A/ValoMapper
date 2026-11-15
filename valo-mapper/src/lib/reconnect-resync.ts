import type { Lobby, UndoableState } from "@/lib/types";

type ReconnectResyncOptions = {
  lobbyCode: string;
  hasPendingCanvasPatches: () => boolean;
  fetchLobby: (lobbyCode: string) => Promise<Lobby>;
};

export const fetchLobbyStateForResync = async ({
  lobbyCode,
  hasPendingCanvasPatches,
  fetchLobby,
}: ReconnectResyncOptions): Promise<UndoableState | null> => {
  // Queued patches are newer than the database.
  if (!lobbyCode || hasPendingCanvasPatches()) {
    return null;
  }

  try {
    const snapshot = await fetchLobby(lobbyCode);
    return snapshot.canvasState;
  } catch {
    return null;
  }
};
