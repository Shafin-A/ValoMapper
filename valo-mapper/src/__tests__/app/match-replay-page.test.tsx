import { act, render, waitFor } from "@testing-library/react";
import MatchReplayPage from "@/app/matches/[matchId]/match-replay-page";
import { useCanvas } from "@/contexts/canvas-context";
import { useMatchSummary } from "@/hooks/api/use-match-summary";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { buildMatchReplayRoundStates } from "@/lib/match-replay";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

let mockToolsSidebarProps: {
  replayControls?: {
    onSelectRound: (roundNumber: number) => void;
    selectedRoundNumber: number;
    currentPlayerBestRoundNumber?: number;
    currentPlayerPuuid?: string;
  };
} | null = null;

jest.mock("@/components/agents-sidebar", () => ({
  AgentsSidebar: () => <div data-testid="agents-sidebar" />,
}));

jest.mock("@/components/canvas", () => ({
  MapStage: () => <div data-testid="map-stage" />,
}));

jest.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));

jest.mock("@/components/matches/match-event-log", () => ({
  MatchEventLog: () => <div data-testid="match-event-log" />,
}));

jest.mock("@/components/matches/match-round-selector", () => ({
  MatchRoundSelector: () => <div data-testid="match-round-selector" />,
}));

jest.mock("@/components/tools-sidebar", () => ({
  ToolsSidebar: (props: typeof mockToolsSidebarProps) => {
    mockToolsSidebarProps = props;
    return <div data-testid="tools-sidebar" />;
  },
}));

jest.mock("@/contexts/canvas-context", () => ({
  useCanvas: jest.fn(),
}));

jest.mock("@/hooks/api/use-match-summary", () => ({
  useMatchSummary: jest.fn(),
}));

jest.mock("@/hooks/use-firebase-auth", () => ({
  useFirebaseAuth: jest.fn(),
}));

jest.mock("@/hooks/use-sidebar-state", () => ({
  useSidebarState: jest.fn(),
}));

jest.mock("@/lib/match-replay", () => ({
  buildMatchReplayRoundStates: jest.fn(),
  cloneUndoableState: jest.fn((state) => state),
}));

const mockUseCanvas = jest.mocked(useCanvas);
const mockUseMatchSummary = jest.mocked(useMatchSummary);
const mockUseFirebaseAuth = jest.mocked(useFirebaseAuth);
const mockUseSidebarState = jest.mocked(useSidebarState);
const mockBuildMatchReplayRoundStates = jest.mocked(
  buildMatchReplayRoundStates,
);
const mockUseParams = jest.mocked(useParams);
const mockUsePathname = jest.mocked(usePathname);
const mockUseRouter = jest.mocked(useRouter);
const mockUseSearchParams = jest.mocked(useSearchParams);

const matchSummary = {
  matchId: "match-1",
  mapId: "/Game/Maps/Ascent/Ascent",
  mapName: "Ascent",
  queueLabel: "Competitive",
  gameStartAt: "2024-01-01T00:00:00Z",
  viewer: {
    puuid: "viewer-puuid",
    bestRoundNumber: 1,
  },
  totalRounds: 2,
  players: [
    {
      puuid: "viewer-puuid",
      gameName: "Viewer",
      tagLine: "NA1",
      teamId: "Blue",
      characterId: "agent-1",
      characterName: "Jett",
    },
  ],
  rounds: [
    {
      roundNumber: 1,
      winningTeam: "Blue",
      roundResultCode: "Elimination",
      scoreAfterRound: {
        red: 0,
        blue: 1,
      },
      playerStats: [],
      eventLog: [],
    },
    {
      roundNumber: 2,
      winningTeam: "Red",
      roundResultCode: "Elimination",
      scoreAfterRound: {
        red: 1,
        blue: 1,
      },
      playerStats: [],
      eventLog: [],
    },
  ],
};

const seededRoundState = {
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
};

const seededSecondRoundState = {
  ...seededRoundState,
  editedPhases: [0],
};

const createCanvasContext = (applyRemoteState: jest.Mock) =>
  ({
    agentsSettings: undefined,
    abilitiesSettings: undefined,
    applyRemoteState,
    currentPhaseIndex: 0,
    editedPhases: new Set([0]),
    isTransitioning: { current: false },
    mapSide: "attack",
    notifyPhaseChangedCallback: { current: null },
    phases: seededRoundState.phases,
    selectedMap: seededRoundState.selectedMap,
    switchToPhase: jest.fn(),
    transitionToPhase: jest.fn(),
  }) as unknown as ReturnType<typeof useCanvas>;

describe("MatchReplayPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToolsSidebarProps = null;

    mockUseParams.mockReturnValue({ matchId: "match-1" });
    mockUsePathname.mockReturnValue("/matches/match-1");
    mockUseRouter.mockReturnValue({
      replace: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("round=1") as unknown as ReturnType<
        typeof useSearchParams
      >,
    );
    mockUseFirebaseAuth.mockReturnValue({
      user: { uid: "firebase-user" },
      loading: false,
    } as unknown as ReturnType<typeof useFirebaseAuth>);
    mockUseSidebarState.mockReturnValue({
      leftSidebarOpen: false,
      setLeftSidebarOpen: jest.fn(),
      rightSidebarOpen: false,
      setRightSidebarOpen: jest.fn(),
    });
    mockUseMatchSummary.mockReturnValue({
      data: matchSummary,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    mockBuildMatchReplayRoundStates.mockReturnValue({
      roundStates: {
        1: seededRoundState,
        2: seededSecondRoundState,
      },
      viewerTeamId: "Blue",
    });
  });

  it("hydrates replay state only once for the same round snapshot", async () => {
    const firstApplyRemoteState = jest.fn();
    let currentCanvasContext = createCanvasContext(firstApplyRemoteState);

    mockUseCanvas.mockImplementation(() => currentCanvasContext);

    const { rerender } = render(<MatchReplayPage />);

    await waitFor(() => {
      expect(firstApplyRemoteState).toHaveBeenCalledTimes(1);
    });

    const secondApplyRemoteState = jest.fn();
    currentCanvasContext = createCanvasContext(secondApplyRemoteState);

    rerender(<MatchReplayPage />);

    await waitFor(() => {
      expect(firstApplyRemoteState).toHaveBeenCalledTimes(1);
      expect(secondApplyRemoteState).not.toHaveBeenCalled();
    });
  });

  it("syncs replay round changes into the query params", async () => {
    const applyRemoteState = jest.fn();
    const replace = jest.fn();

    mockUseCanvas.mockImplementation(() =>
      createCanvasContext(applyRemoteState),
    );
    mockUseRouter.mockReturnValue({
      replace,
    } as unknown as ReturnType<typeof useRouter>);
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("round=1&tab=replay") as unknown as ReturnType<
        typeof useSearchParams
      >,
    );

    render(<MatchReplayPage />);

    await waitFor(() => {
      expect(applyRemoteState).toHaveBeenCalledTimes(1);
      expect(mockToolsSidebarProps?.replayControls?.selectedRoundNumber).toBe(
        1,
      );
    });

    act(() => {
      mockToolsSidebarProps?.replayControls?.onSelectRound(2);
    });

    await waitFor(() => {
      expect(mockToolsSidebarProps?.replayControls?.selectedRoundNumber).toBe(
        2,
      );
      expect(replace).toHaveBeenCalledWith(
        "/matches/match-1?round=2&tab=replay",
        { scroll: false },
      );
    });
  });

  it("renders replay without viewer context for public access", async () => {
    const applyRemoteState = jest.fn();

    mockUseCanvas.mockImplementation(() =>
      createCanvasContext(applyRemoteState),
    );
    mockUseMatchSummary.mockReturnValue({
      data: {
        ...matchSummary,
        viewer: null,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    mockBuildMatchReplayRoundStates.mockReturnValue({
      roundStates: {
        1: seededRoundState,
        2: seededSecondRoundState,
      },
      viewerTeamId: undefined,
    });

    render(<MatchReplayPage />);

    await waitFor(() => {
      expect(applyRemoteState).toHaveBeenCalledTimes(1);
      expect(mockToolsSidebarProps?.replayControls?.selectedRoundNumber).toBe(
        1,
      );
      expect(
        mockToolsSidebarProps?.replayControls?.currentPlayerBestRoundNumber,
      ).toBeUndefined();
      expect(
        mockToolsSidebarProps?.replayControls?.currentPlayerPuuid,
      ).toBeUndefined();
    });
  });
});
