import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { ApiError, apiFetch, apiFetchWithAuth } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { buildTree } from "@/lib/strategy-tree";
import { Folder, MatchPreviewsResponse, Strategy } from "@/lib/types";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useBillingPlans } from "@/hooks/api/use-billing-plans";
import { useFolders } from "@/hooks/api/use-folder";
import { useLobby } from "@/hooks/api/use-lobby";
import { useMatches } from "@/hooks/api/use-matches";
import { useMatchSummary } from "@/hooks/api/use-match-summary";
import {
  usePendingStackInvite,
  usePendingStackInvites,
} from "@/hooks/api/use-pending-stack-invite";
import { useStackMembers } from "@/hooks/api/use-stack-members";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  apiFetch: jest.fn(),
  apiFetchWithAuth: jest.fn(),
}));

jest.mock("@/hooks/use-firebase-auth");

const mockApiFetch = jest.mocked(apiFetch);
const mockApiFetchWithAuth = jest.mocked(apiFetchWithAuth);
const mockUseFirebaseAuth = jest.mocked(useFirebaseAuth);

const getIdToken = jest.fn().mockResolvedValue("id-token");

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "QueryTestWrapper";

  return { wrapper: Wrapper, queryClient };
};

const setAuth = (
  overrides: Partial<ReturnType<typeof useFirebaseAuth>> = {},
) => {
  mockUseFirebaseAuth.mockReturnValue({
    user: { uid: "uid-1" } as never,
    loading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    logout: jest.fn(),
    getIdToken,
    ...overrides,
  } as ReturnType<typeof useFirebaseAuth>);
};

const folders: Folder[] = [
  {
    id: 1,
    userId: 1,
    name: "Lineups",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  },
];

const strategies: Strategy[] = [
  {
    id: 7,
    userId: 1,
    folderId: 1,
    name: "B Rush",
    selectedMapId: "ascent",
    lobbyCode: "ABCD",
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  },
];

describe("query hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getIdToken.mockResolvedValue("id-token");
    setAuth();
  });

  it("loads a lobby by code", async () => {
    mockApiFetch.mockResolvedValue({
      code: "ABCD",
      selectedMapId: "ascent",
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLobby("ABCD"), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({
      code: "ABCD",
      selectedMapId: "ascent",
    });
    expect(result.current.isError).toBe(false);
    expect(mockApiFetch).toHaveBeenCalledWith("/api/lobbies/ABCD");
  });

  it("does not load a lobby without a code", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLobby(""), { wrapper });

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("loads billing plans", async () => {
    const plans = {
      monthly: {
        plan: "monthly",
        priceId: "price_monthly",
        currency: "usd",
        unitAmount: 500,
        unitAmountDecimal: "5.00",
        interval: "month",
        intervalCount: 1,
      },
      yearly: {
        plan: "yearly",
        priceId: "price_yearly",
        currency: "usd",
        unitAmount: 4000,
        unitAmountDecimal: "40.00",
        interval: "year",
        intervalCount: 1,
      },
      stack: {
        plan: "stack",
        priceId: "price_stack",
        currency: "usd",
        unitAmount: 800,
        unitAmountDecimal: "8.00",
        interval: "month",
        intervalCount: 1,
      },
    };
    mockApiFetch.mockResolvedValue(plans);

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useBillingPlans(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(plans);
    expect(mockApiFetch).toHaveBeenCalledWith("/api/billing/plans");
    expect(queryClient.getQueryState(queryKeys.billingPlans)?.status).toBe(
      "success",
    );
  });

  it("loads stack members only when enabled", async () => {
    mockApiFetchWithAuth.mockResolvedValue({
      members: [{ id: 1, firebaseUid: "uid-1" }],
      isStackOwner: true,
    });

    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useStackMembers(enabled),
      { wrapper, initialProps: { enabled: false } },
    );

    expect(mockApiFetchWithAuth).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({
      members: [{ id: 1, firebaseUid: "uid-1" }],
      isStackOwner: true,
    });
    expect(mockApiFetchWithAuth).toHaveBeenCalledWith(
      "/api/billing/stack/members",
      getIdToken,
    );
  });

  it("loads pending stack invites", async () => {
    mockApiFetchWithAuth.mockResolvedValue([{ id: 3, firebaseUid: "uid-3" }]);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePendingStackInvites(true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([{ id: 3, firebaseUid: "uid-3" }]);
    expect(mockApiFetchWithAuth).toHaveBeenCalledWith(
      "/api/billing/stack/pending-invites",
      getIdToken,
    );
  });

  it("treats a 404 on pending invites as an empty list", async () => {
    mockApiFetchWithAuth.mockRejectedValue(
      new ApiError("Not found", 404, "Not Found"),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePendingStackInvites(true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it("propagates non-404 pending invite errors", async () => {
    mockApiFetchWithAuth.mockRejectedValue(
      new ApiError("Forbidden", 403, "Forbidden"),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePendingStackInvites(true), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.data).toBeUndefined();
  });

  it("keeps the legacy pending invite alias", () => {
    expect(usePendingStackInvite).toBe(usePendingStackInvites);
  });

  it("builds the folder tree from folders and strategies", async () => {
    mockApiFetchWithAuth.mockImplementation((url) =>
      Promise.resolve(url === "/api/folders" ? folders : strategies),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFolders(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(buildTree(folders, strategies));
    expect(mockApiFetchWithAuth).toHaveBeenCalledWith(
      "/api/folders",
      getIdToken,
    );
    expect(mockApiFetchWithAuth).toHaveBeenCalledWith(
      "/api/strategies",
      getIdToken,
    );
  });

  it("does not load folders without an authenticated user", () => {
    setAuth({ user: null });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFolders(), { wrapper });

    expect(mockApiFetchWithAuth).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("reports loading while auth is resolving", () => {
    setAuth({ user: null, loading: true });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFolders(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(mockApiFetchWithAuth).not.toHaveBeenCalled();
  });

  it("loads the first page of matches and fetches the next page", async () => {
    const firstPage: MatchPreviewsResponse = {
      matches: [
        {
          matchId: "match-1",
          playedAt: 1,
          queueLabel: "Competitive",
          mapId: "ascent",
          mapName: "Ascent",
          result: "Win",
          teamScore: 13,
          enemyScore: 9,
          kills: 20,
          deaths: 10,
          assists: 5,
          personalScore: 4000,
          agentId: "astra-id",
          agentName: "Astra",
        },
      ],
      pagination: {
        start: 0,
        limit: 10,
        total: 2,
        hasMore: true,
        nextStart: 10,
      },
    };
    const secondPage: MatchPreviewsResponse = {
      matches: [
        {
          ...firstPage.matches[0],
          matchId: "match-2",
        },
      ],
      pagination: {
        start: 10,
        limit: 10,
        total: 2,
        hasMore: false,
        nextStart: null,
      },
    };

    mockApiFetchWithAuth.mockImplementation((url) =>
      Promise.resolve(url.includes("start=10") ? secondPage : firstPage),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMatches(true, 10), { wrapper });

    await waitFor(() => {
      expect(result.current.matches).toHaveLength(1);
    });

    expect(result.current.matches[0].matchId).toBe("match-1");
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.pagination).toEqual(firstPage.pagination);
    expect(mockApiFetchWithAuth).toHaveBeenCalledWith(
      "/api/matches?start=0&limit=10",
      getIdToken,
    );

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.matches).toHaveLength(2);
    });

    expect(result.current.matches.map((match) => match.matchId)).toEqual([
      "match-1",
      "match-2",
    ]);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.pagination).toEqual(secondPage.pagination);
    expect(mockApiFetchWithAuth).toHaveBeenCalledWith(
      "/api/matches?start=10&limit=10",
      getIdToken,
    );
  });

  it("does not load matches when disabled", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMatches(false), { wrapper });

    expect(mockApiFetchWithAuth).not.toHaveBeenCalled();
    expect(result.current.matches).toEqual([]);
    expect(result.current.pagination).toEqual({
      start: 0,
      limit: 10,
      total: 0,
      hasMore: false,
      nextStart: null,
    });
    expect(result.current.hasNextPage).toBe(false);
  });

  it("loads a match summary with replay telemetry", async () => {
    const summary = {
      matchId: "match/1",
      mapId: "ascent",
      mapName: "Ascent",
      queueLabel: "Competitive",
      gameStartAt: "2026-01-01T00:00:00Z",
      viewer: { puuid: "puuid-1", bestRoundNumber: 2 },
      totalRounds: 1,
      players: [],
      rounds: [],
    };
    mockApiFetch.mockResolvedValue(summary);

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () => useMatchSummary("match/1", true, true),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(summary);
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/matches/match%2F1/summary?includeReplayTelemetry=true",
      { token: "id-token" },
    );
    expect(
      queryClient.getQueryState(
        queryKeys.matchSummary("match/1", true, "uid-1"),
      )?.status,
    ).toBe("success");
  });

  it("omits replay telemetry from a normal summary request", async () => {
    mockApiFetch.mockResolvedValue({ matchId: "match-1" });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useMatchSummary("match-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/matches/match-1/summary",
      { token: "id-token" },
    );
  });

  it("does not load a summary without an id or when disabled", () => {
    const { wrapper } = createWrapper();
    const { rerender } = renderHook(
      ({ id, enabled }: { id: string | null; enabled: boolean }) =>
        useMatchSummary(id, enabled),
      {
        wrapper,
        initialProps: { id: null, enabled: true } as {
          id: string | null;
          enabled: boolean;
        },
      },
    );

    rerender({ id: "match-1", enabled: false });

    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});
