import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useUpdateLobby } from "@/hooks/api/use-update-lobby";

global.fetch = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "UpdateLobbyTestWrapper";

  return Wrapper;
};

describe("useUpdateLobby", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("persists traversal time metadata when saving draw lines", async () => {
    const canvasState = {
      phases: [
        {
          agentsOnCanvas: [],
          abilitiesOnCanvas: [],
          drawLines: [
            {
              id: "line-1",
              tool: "pencil" as const,
              points: [
                { x: 10, y: 20 },
                { x: 110, y: 20 },
              ],
              color: "#fff",
              size: 2,
              isDashed: false,
              isArrowHead: false,
              shape: "straight" as const,
              opacity: 1,
              traversalTime: "knife-walk" as const,
            },
          ],
          connectingLines: [],
          textsOnCanvas: [],
          imagesOnCanvas: [],
          toolIconsOnCanvas: [],
        },
      ],
      selectedMap: {
        id: "ascent",
        text: "Ascent",
        textColor: "text-white",
      },
      mapSide: "attack" as const,
      currentPhaseIndex: 0,
      editedPhases: [0],
      agentsSettings: undefined,
      abilitiesSettings: undefined,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        lobbyCode: "ABCD",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        canvasState,
      }),
    });

    const { result } = renderHook(() => useUpdateLobby("ABCD"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(canvasState);
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/lobbies/ABCD", {
      method: "PATCH",
      body: JSON.stringify({ canvasState }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  });
});
