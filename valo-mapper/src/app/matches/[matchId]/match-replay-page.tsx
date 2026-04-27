"use client";

import { AgentsSidebar } from "@/components/agents-sidebar";
import { MapStage, MapStageHandle } from "@/components/canvas";
import { SiteHeader } from "@/components/layout/site-header";
import { MatchEventLog } from "@/components/matches/match-event-log";
import { MatchRoundSelector } from "@/components/matches/match-round-selector";
import { ToolsSidebar } from "@/components/tools-sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCanvas } from "@/contexts/canvas-context";
import { useMatchSummary } from "@/hooks/api/use-match-summary";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import {
  buildMatchReplayRoundStates,
  cloneUndoableState,
} from "@/lib/match-replay";
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH, MAP_SIZE } from "@/lib/consts";
import { getPlayerSummary } from "@/lib/matches";
import { UndoableState } from "@/lib/types";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const MatchReplayPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId =
    typeof params?.matchId === "string" ? params.matchId : undefined;
  const requestedRoundNumber = Number(searchParams.get("round") ?? "1");
  const { user: firebaseUser, loading: authLoading } = useFirebaseAuth();
  const {
    data: matchSummary,
    isLoading,
    isError,
    error,
    refetch,
  } = useMatchSummary(matchId ?? null, true, true);

  const sidebarState = useSidebarState();
  const divRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<MapStageHandle | null>(null);
  const hydratedMatchIdRef = useRef<string | null>(null);
  const currentRoundRef = useRef<number | null>(null);
  const appliedRoundStateRef = useRef<{
    matchId: string | null;
    roundNumber: number | null;
    state: UndoableState | null;
  }>({
    matchId: null,
    roundNumber: null,
    state: null,
  });
  const [stageScale, setStageScale] = useState(1);
  const [isScaleReady, setIsScaleReady] = useState(false);
  const [selectedRoundNumber, setSelectedRoundNumber] = useState(1);
  const [roundStates, setRoundStates] = useState<Record<number, UndoableState>>(
    {},
  );

  const {
    agentsSettings,
    abilitiesSettings,
    applyRemoteState,
    currentPhaseIndex,
    editedPhases,
    isTransitioning,
    mapSide,
    notifyPhaseChangedCallback,
    phases,
    selectedMap,
    switchToPhase,
    transitionToPhase,
  } = useCanvas();

  const replaySeed = useMemo(() => {
    if (!matchSummary) {
      return null;
    }

    return buildMatchReplayRoundStates(matchSummary, agentsSettings);
  }, [matchSummary, agentsSettings]);

  const roundOptions = useMemo(
    () => matchSummary?.rounds ?? [],
    [matchSummary],
  );

  const resolvedRoundNumber = useMemo(() => {
    if (roundOptions.length === 0) {
      return 1;
    }

    return roundOptions.some(
      (round) => round.roundNumber === requestedRoundNumber,
    )
      ? requestedRoundNumber
      : roundOptions[0].roundNumber;
  }, [requestedRoundNumber, roundOptions]);

  useEffect(() => {
    if (!matchSummary || !replaySeed) {
      return;
    }

    if (hydratedMatchIdRef.current === matchSummary.matchId) {
      return;
    }

    hydratedMatchIdRef.current = matchSummary.matchId;
    currentRoundRef.current = null;
    appliedRoundStateRef.current = {
      matchId: null,
      roundNumber: null,
      state: null,
    };
    setRoundStates(replaySeed.roundStates);
    setSelectedRoundNumber(resolvedRoundNumber);
  }, [matchSummary, replaySeed, resolvedRoundNumber]);

  useEffect(() => {
    const nextRoundState = roundStates[selectedRoundNumber];
    if (!nextRoundState || !matchSummary) {
      return;
    }

    const lastApplied = appliedRoundStateRef.current;
    if (
      lastApplied.matchId === matchSummary.matchId &&
      lastApplied.roundNumber === selectedRoundNumber &&
      lastApplied.state === nextRoundState
    ) {
      return;
    }

    applyRemoteState(cloneUndoableState(nextRoundState));
    currentRoundRef.current = selectedRoundNumber;
    appliedRoundStateRef.current = {
      matchId: matchSummary.matchId,
      roundNumber: selectedRoundNumber,
      state: nextRoundState,
    };
  }, [applyRemoteState, matchSummary, roundStates, selectedRoundNumber]);

  useLayoutEffect(() => {
    let scaleReady = false;

    const markScaleReady = () => {
      if (scaleReady) return;
      scaleReady = true;
      setIsScaleReady(true);
    };

    const updateScale = () => {
      if (!divRef.current) return;

      const containerWidth = divRef.current.offsetWidth;
      const containerHeight = divRef.current.offsetHeight;

      if (containerWidth === 0 || containerHeight === 0) return;

      const scaleX = containerWidth / VIRTUAL_WIDTH;
      const scaleY = containerHeight / VIRTUAL_HEIGHT;
      const scale = Math.min(scaleX, scaleY);

      setStageScale(scale);
      markScaleReady();
    };

    const timeoutId = window.setTimeout(updateScale, 0);
    const fallbackTimeout = window.setTimeout(() => {
      if (scaleReady) return;
      if (!divRef.current) {
        setStageScale(1);
        markScaleReady();
        return;
      }

      const containerWidth = divRef.current.offsetWidth;
      const containerHeight = divRef.current.offsetHeight;
      if (containerWidth > 0 && containerHeight > 0) {
        updateScale();
      } else {
        setStageScale(1);
        markScaleReady();
      }
    }, 1500);

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(updateScale);
      window.setTimeout(() => {
        if (divRef.current) {
          resizeObserver.observe(divRef.current);
        }
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
        window.clearTimeout(fallbackTimeout);
        resizeObserver.disconnect();
      };
    }

    window.addEventListener("resize", updateScale);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(fallbackTimeout);
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  const snapshotCurrentRoundState = useCallback((): UndoableState => {
    return cloneUndoableState({
      phases,
      selectedMap,
      mapSide,
      currentPhaseIndex,
      editedPhases: Array.from(editedPhases),
      agentsSettings,
      abilitiesSettings,
    });
  }, [
    abilitiesSettings,
    agentsSettings,
    currentPhaseIndex,
    editedPhases,
    mapSide,
    phases,
    selectedMap,
  ]);

  const handleSelectRound = useCallback(
    (roundNumber: number) => {
      if (roundNumber === selectedRoundNumber) {
        return;
      }

      setRoundStates((prev) => {
        const currentRound = currentRoundRef.current;

        if (currentRound == null) {
          return prev;
        }

        return {
          ...prev,
          [currentRound]: snapshotCurrentRoundState(),
        };
      });
      setSelectedRoundNumber(roundNumber);
    },
    [selectedRoundNumber, snapshotCurrentRoundState],
  );

  const handleSelectReplayPhase = useCallback(
    async (phaseIndex: number) => {
      if (phaseIndex === currentPhaseIndex || isTransitioning.current) {
        return;
      }

      const currentPhase = phases[currentPhaseIndex];
      const nextPhase = phases[phaseIndex];
      if (!currentPhase || !nextPhase) {
        return;
      }

      await transitionToPhase(currentPhase, nextPhase, 200);
      switchToPhase(phaseIndex);
      notifyPhaseChangedCallback.current?.(phaseIndex);
    },
    [
      currentPhaseIndex,
      isTransitioning,
      notifyPhaseChangedCallback,
      phases,
      switchToPhase,
      transitionToPhase,
    ],
  );

  const selectedRound =
    matchSummary?.rounds.find(
      (round) => round.roundNumber === selectedRoundNumber,
    ) ?? matchSummary?.rounds[0];
  const currentPlayer = matchSummary
    ? getPlayerSummary(matchSummary.players, matchSummary.viewer.puuid)
    : undefined;
  const selectedEventIndex =
    selectedRound && currentPhaseIndex < selectedRound.eventLog.length
      ? currentPhaseIndex
      : null;
  const mapPosition = {
    x: (VIRTUAL_WIDTH - MAP_SIZE) / 2,
    y: (VIRTUAL_HEIGHT - MAP_SIZE) / 2,
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">
            Loading match replay...
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-4">
          <Alert>
            <AlertTitle>Sign in required</AlertTitle>
            <AlertDescription>
              Sign in with Riot Sign-On to load match replay telemetry.
            </AlertDescription>
          </Alert>
          <Button asChild>
            <Link
              href={`/login?redirect=${encodeURIComponent(`/matches/${matchId ?? ""}`)}`}
            >
              Sign In
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isError || !matchSummary || !selectedRound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load match replay</AlertTitle>
            <AlertDescription>
              {error?.message ||
                "Something went wrong while loading replay telemetry for this match."}
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={() => void refetch()}>Try Again</Button>
            <Button variant="outline" asChild>
              <Link href="/matches">Back to Matches</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SiteHeader {...sidebarState} />

      <ToolsSidebar
        sidebarOpen={sidebarState.leftSidebarOpen}
        mapPosition={mapPosition}
        stageRef={stageRef}
      />

      <Suspense fallback={<ReplayLoadingSkeleton />}>
        <div
          className="flex h-[calc(100svh-1px-var(--header-height))] overflow-hidden"
          ref={divRef}
        >
          {!isScaleReady ? (
            <ReplayLoadingSkeleton />
          ) : (
            <div className="relative flex-1">
              <MapStage
                ref={stageRef}
                width={VIRTUAL_WIDTH}
                height={VIRTUAL_HEIGHT}
                scale={stageScale}
                mapPosition={mapPosition}
              />

              <div className="pointer-events-none absolute inset-x-3 top-3 z-20 md:inset-x-auto md:right-3 md:w-[380px]">
                <section className="pointer-events-auto rounded-xl border border-slate-700/80 bg-slate-950/90 shadow-xl backdrop-blur">
                  <div className="border-b border-slate-800 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
                          Match Replay
                        </p>
                        <h2 className="text-lg font-semibold text-white">
                          {matchSummary.mapName} • Round{" "}
                          {selectedRound.roundNumber}
                        </h2>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/matches">
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <MatchRoundSelector
                      rounds={matchSummary.rounds}
                      selectedRoundNumber={selectedRound.roundNumber}
                      currentPlayerTeamId={currentPlayer?.teamId}
                      currentPlayerBestRoundNumber={
                        matchSummary.viewer.bestRoundNumber
                      }
                      onSelectRound={handleSelectRound}
                    />

                    <MatchEventLog
                      containerClassName="h-auto"
                      scrollAreaClassName="h-[280px]"
                      events={selectedRound.eventLog}
                      players={matchSummary.players}
                      currentPlayerPuuid={matchSummary.viewer.puuid}
                      selectedEventIndex={selectedEventIndex}
                      onSelectEvent={(eventIndex) =>
                        void handleSelectReplayPhase(eventIndex)
                      }
                    />
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </Suspense>

      <AgentsSidebar
        sidebarOpen={sidebarState.rightSidebarOpen}
        setSidebarOpen={sidebarState.setRightSidebarOpen}
      />
    </div>
  );
};

const ReplayLoadingSkeleton = () => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Preparing replay...</p>
      </div>
    </div>
  );
};

export default MatchReplayPage;
