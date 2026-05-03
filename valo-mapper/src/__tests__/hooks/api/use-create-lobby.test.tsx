import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCreateLobby } from "@/hooks/api/use-create-lobby";
import { PENDING_LOBBY_TOAST_STORAGE_KEY } from "@/lib/lobby-creation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
  },
}));

const mockUseRouter = jest.mocked(useRouter);

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
  Wrapper.displayName = "CreateLobbyTestWrapper";

  return Wrapper;
};

describe("useCreateLobby", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  it("creates a blank lobby and stores the default created toast context", async () => {
    const push = jest.fn();

    mockUseRouter.mockReturnValue({
      push,
    } as unknown as ReturnType<typeof useRouter>);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        lobbyCode: "ABCD",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        canvasState: null,
      }),
    });

    const { result } = renderHook(() => useCreateLobby(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("/api/lobbies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    expect(push).toHaveBeenCalledWith("/ABCD");
    expect(sessionStorage.getItem(PENDING_LOBBY_TOAST_STORAGE_KEY)).toBe(
      JSON.stringify({ type: "created" }),
    );
  });

  it("seeds a newly created lobby with the provided canvas state", async () => {
    const push = jest.fn();
    const canvasState = {
      phases: [
        {
          agentsOnCanvas: [],
          abilitiesOnCanvas: [],
          drawLines: [],
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

    mockUseRouter.mockReturnValue({
      push,
    } as unknown as ReturnType<typeof useRouter>);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          lobbyCode: "EFGH",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          canvasState: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          lobbyCode: "EFGH",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          canvasState,
        }),
      });

    const { result } = renderHook(() => useCreateLobby(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        initialCanvasState: canvasState,
        pendingToast: {
          type: "replay-copy",
          roundNumber: 7,
          matchId: "match-123",
        },
      });
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/lobbies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/lobbies/EFGH", {
      method: "PATCH",
      body: JSON.stringify({ canvasState }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    expect(push).toHaveBeenCalledWith("/EFGH");
    expect(sessionStorage.getItem(PENDING_LOBBY_TOAST_STORAGE_KEY)).toBe(
      JSON.stringify({
        type: "replay-copy",
        roundNumber: 7,
        matchId: "match-123",
      }),
    );
  });
});
