import { fetchLobbyStateForResync } from "@/lib/reconnect-resync";
import type { Lobby, UndoableState } from "@/lib/types";

const canvasState: UndoableState = {
  phases: [],
  selectedMap: { id: "ascent", text: "Ascent", textColor: "#ffffff" },
  mapSide: "attack",
  currentPhaseIndex: 0,
  editedPhases: [0],
};

const lobby = (state: UndoableState | null): Lobby => ({
  lobbyCode: "ABCDEFG",
  createdAt: new Date(),
  updatedAt: new Date(),
  canvasState: state,
});

const noPendingPatches = () => false;

describe("fetchLobbyStateForResync", () => {
  it("returns the durable canvas state", async () => {
    const fetchLobby = jest.fn().mockResolvedValue(lobby(canvasState));

    await expect(
      fetchLobbyStateForResync({
        lobbyCode: "ABCDEFG",
        hasPendingCanvasPatches: noPendingPatches,
        fetchLobby,
      }),
    ).resolves.toBe(canvasState);

    expect(fetchLobby).toHaveBeenCalledWith("ABCDEFG");
  });

  it("skips the fetch while local patches are still queued", async () => {
    const fetchLobby = jest.fn();

    await expect(
      fetchLobbyStateForResync({
        lobbyCode: "ABCDEFG",
        hasPendingCanvasPatches: () => true,
        fetchLobby,
      }),
    ).resolves.toBeNull();

    expect(fetchLobby).not.toHaveBeenCalled();
  });

  it("returns null without a lobby code", async () => {
    const fetchLobby = jest.fn();

    await expect(
      fetchLobbyStateForResync({
        lobbyCode: "",
        hasPendingCanvasPatches: noPendingPatches,
        fetchLobby,
      }),
    ).resolves.toBeNull();

    expect(fetchLobby).not.toHaveBeenCalled();
  });

  it("returns null when the lobby has no canvas state", async () => {
    const fetchLobby = jest.fn().mockResolvedValue(lobby(null));

    await expect(
      fetchLobbyStateForResync({
        lobbyCode: "ABCDEFG",
        hasPendingCanvasPatches: noPendingPatches,
        fetchLobby,
      }),
    ).resolves.toBeNull();
  });

  it("returns null when the fetch fails", async () => {
    const fetchLobby = jest.fn().mockRejectedValue(new Error("offline"));

    await expect(
      fetchLobbyStateForResync({
        lobbyCode: "ABCDEFG",
        hasPendingCanvasPatches: noPendingPatches,
        fetchLobby,
      }),
    ).resolves.toBeNull();
  });
});
