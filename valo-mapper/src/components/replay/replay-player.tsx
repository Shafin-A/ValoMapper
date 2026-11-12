"use client";

import { MapStage, MapStageHandle } from "@/components/canvas";
import { SiteHeader } from "@/components/layout/site-header";
import { ToolsSidebar } from "@/components/tools-sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCanvasActions,
  useCanvasPhase,
  useCanvasView,
} from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useCreateLobby } from "@/hooks/api/use-create-lobby";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReplayClockStep } from "@/hooks/use-replay-clock";
import { useReplayPlayback } from "@/hooks/use-replay-playback";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { MAP_SIZE, SIDEBAR_WIDTH, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "@/lib/consts";
import { getCanvasFitScale } from "@/lib/canvas-scale";
import {
  buildReplayInitialState,
  buildReplaySnapshotState,
  getReplayMapOption,
} from "@/lib/replay";
import type { ReplayClock } from "@/lib/replay/clock";
import { getReplayFrameAtTime } from "@/lib/replay/frames";
import type { ReplayMatch } from "@/lib/replay/types";
import type { UndoableState } from "@/lib/types";
import { AlertCircle, ArrowUpRight, Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ReplayCanvasOverlay } from "./replay-canvas-overlay";
import { ReplayControlsBar } from "./replay-controls-bar";
import { ReplayRoundSidebar } from "./replay-round-sidebar";

const REPLAY_MAP_SIDE = "defense" as const;

const REPLAY_MAP_POSITION = {
  x: (VIRTUAL_WIDTH - MAP_SIZE) / 2,
  y: (VIRTUAL_HEIGHT - MAP_SIZE) / 2,
};

export const ReplayPlayer = ({
  match,
  replayId,
}: {
  match: ReplayMatch;
  replayId: string;
}) => {
  const sidebarState = useSidebarState();
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<MapStageHandle | null>(null);
  const appliedReplayRef = useRef<string | null>(null);

  const { agentsSettings, abilitiesSettings } = useSettings();
  const { applyRemoteState } = useCanvasActions();
  const { currentPhaseIndex, editedPhases, phases } = useCanvasPhase();
  const { mapSide, selectedMap } = useCanvasView();
  const createLobbyMutation = useCreateLobby();

  const firstRound = match.rounds[0];
  const [selectedRoundNumber, setSelectedRoundNumber] = useState(
    firstRound?.roundNumber ?? 1,
  );
  const [stageScale, setStageScale] = useState(1);
  const isMobile = useIsMobile();
  const [isScaleReady, setIsScaleReady] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [hideDeadAgents, setHideDeadAgents] = useState(false);
  const [hideAgentWeapons, setHideAgentWeapons] = useState(false);
  const [hideWeaponHits, setHideWeaponHits] = useState(false);
  const [showVisionCones, setShowVisionCones] = useState(true);
  const [showUtilities, setShowUtilities] = useState(true);
  const [startAtBarrierDrop, setStartAtBarrierDrop] = useState(true);

  const round =
    match.rounds.find(
      (candidate) => candidate.roundNumber === selectedRoundNumber,
    ) ?? firstRound;

  useEffect(() => {
    setSelectedRoundNumber(firstRound?.roundNumber ?? 1);
  }, [firstRound?.roundNumber, replayId]);

  const {
    clock,
    isPlaying,
    speed,
    seek,
    setSpeed,
    togglePlay,
    getCurrentTimeMs,
  } = useReplayPlayback({
    durationMs: round?.durationMs ?? 0,
    resetKey: `${replayId}:${round?.roundNumber ?? 0}`,
    startTimeMs: startAtBarrierDrop ? (round?.buyEndTimeMs ?? 0) : 0,
  });

  const canSaveReplay = Boolean(round && round.frames.length > 0);

  const currentState = useMemo<UndoableState>(
    () => ({
      phases,
      selectedMap,
      mapSide,
      currentPhaseIndex,
      editedPhases: Array.from(editedPhases),
      agentsSettings,
      abilitiesSettings,
    }),
    [
      abilitiesSettings,
      agentsSettings,
      currentPhaseIndex,
      editedPhases,
      mapSide,
      phases,
      selectedMap,
    ],
  );

  useEffect(() => {
    if (appliedReplayRef.current === replayId) {
      return;
    }

    appliedReplayRef.current = replayId;
    applyRemoteState(
      buildReplayInitialState({
        selectedMap: getReplayMapOption(match),
        mapSide: REPLAY_MAP_SIDE,
        agentsSettings,
        abilitiesSettings,
      }),
    );
  }, [
    abilitiesSettings,
    agentsSettings,
    applyRemoteState,
    match,
    replayId,
  ]);

  useLayoutEffect(() => {
    let scaleReady = false;

    const markScaleReady = () => {
      if (scaleReady) return;
      scaleReady = true;
      setIsScaleReady(true);
    };

    const updateScale = () => {
      if (!stageContainerRef.current) return;

      const containerWidth = stageContainerRef.current.offsetWidth;
      const containerHeight = stageContainerRef.current.offsetHeight;

      if (containerWidth === 0 || containerHeight === 0) return;

      setStageScale(
        getCanvasFitScale(containerWidth, containerHeight, isMobile),
      );
      markScaleReady();
    };

    const timeoutId = window.setTimeout(updateScale, 0);
    const fallbackTimeout = window.setTimeout(() => {
      if (!scaleReady) {
        setStageScale(1);
        markScaleReady();
      }
    }, 1500);

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(updateScale);
      window.setTimeout(() => {
        if (stageContainerRef.current) {
          resizeObserver.observe(stageContainerRef.current);
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
  }, [isMobile]);

  const handleSelectRound = useCallback((roundNumber: number) => {
    setSelectedRoundNumber(roundNumber);
  }, []);

  const handleTimelineSeek = useCallback(
    (timeMs: number) => {
      seek(timeMs, { pause: false });
    },
    [seek],
  );

  const handleSelectEvent = useCallback(
    (eventIndex: number) => {
      const event = round?.eventLog[eventIndex];
      if (event) {
        seek(event.timeSinceRoundStartMillis);
      }
    },
    [round, seek],
  );

  const handleSaveToLobby = useCallback(() => {
    const timeMs = getCurrentTimeMs();
    const frame = round ? getReplayFrameAtTime(round, timeMs) : null;

    if (!round || !frame) {
      return;
    }

    createLobbyMutation.mutate({
      initialCanvasState: buildReplaySnapshotState({
        match,
        round,
        frame,
        currentState,
        mapSide,
        hideDeadAgents,
        hideAgentWeapons,
        showVisionCones,
        showUtilities,
      }),
      pendingToast: {
        type: "replay-save",
        roundNumber: round.roundNumber,
        timeMs: Math.round(timeMs),
        replayId,
      },
    });
  }, [
    createLobbyMutation,
    currentState,
    getCurrentTimeMs,
    hideAgentWeapons,
    hideDeadAgents,
    mapSide,
    match,
    replayId,
    round,
    showVisionCones,
    showUtilities,
  ]);

  if (!round) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Replay has no rounds</AlertTitle>
            <AlertDescription>
              This replay did not contain any round data to play back.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const controlsInsetStyle = {
    "--replay-controls-left": `${sidebarState.leftSidebarOpen ? SIDEBAR_WIDTH : 0}px`,
    "--replay-controls-right": `${sidebarState.rightSidebarOpen ? SIDEBAR_WIDTH : 0}px`,
  } as CSSProperties;

  return (
    <div className="[--header-height:calc(--spacing(14)_+_env(safe-area-inset-top))]">
      <SiteHeader {...sidebarState} />

      <ToolsSidebar
        variant="replay"
        sidebarOpen={sidebarState.leftSidebarOpen}
        setSidebarOpen={sidebarState.setLeftSidebarOpen}
        mapPosition={REPLAY_MAP_POSITION}
        stageRef={stageRef}
        saveAction={{
          icon: ArrowUpRight,
          label: "Copy to new lobby",
          tooltip: createLobbyMutation.isPending
            ? "Creating a new lobby from the current replay frame..."
            : `Copy Round ${round.roundNumber} at this moment into a new editable lobby`,
          onClick: () => setIsSaveDialogOpen(true),
          isPending: createLobbyMutation.isPending,
        }}
      />

      <div className="flex h-[calc(100svh-1px-var(--header-height))] overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1" ref={stageContainerRef}>
            {isScaleReady ? (
              <MapStage
                ref={stageRef}
                width={VIRTUAL_WIDTH}
                height={VIRTUAL_HEIGHT}
                scale={stageScale}
                mapPosition={REPLAY_MAP_POSITION}
                enableMultiSelect={false}
                replayOverlay={
                  <ReplayCanvasOverlay
                    clock={clock}
                    match={match}
                    round={round}
                    mapSide={mapSide}
                    hideDeadAgents={hideDeadAgents}
                    hideAgentWeapons={hideAgentWeapons}
                    hideWeaponHits={hideWeaponHits}
                    showVisionCones={showVisionCones}
                    showUtilities={showUtilities}
                  />
                }
              />
            ) : (
              <ReplayPlayerLoadingSkeleton />
            )}
          </div>

          <div
            className="transition-[padding] duration-200 ease-linear md:pl-(--replay-controls-left) md:pr-(--replay-controls-right)"
            style={controlsInsetStyle}
          >
            <ReplayControlsBar
              rounds={match.rounds}
              selectedRoundNumber={round.roundNumber}
              onSelectRound={handleSelectRound}
              round={round}
              players={match.players}
              clock={clock}
              isPlaying={isPlaying}
              speed={speed}
              onTogglePlay={togglePlay}
              onSeek={handleTimelineSeek}
              onSpeedChange={setSpeed}
              hideDeadAgents={hideDeadAgents}
              onHideDeadAgentsChange={setHideDeadAgents}
              hideAgentWeapons={hideAgentWeapons}
              onHideAgentWeaponsChange={setHideAgentWeapons}
              hideWeaponHits={hideWeaponHits}
              onHideWeaponHitsChange={setHideWeaponHits}
              showVisionCones={showVisionCones}
              onShowVisionConesChange={setShowVisionCones}
              showUtilities={showUtilities}
              onShowUtilitiesChange={setShowUtilities}
              startAtBarrierDrop={startAtBarrierDrop}
              onStartAtBarrierDropChange={setStartAtBarrierDrop}
            />
          </div>
        </div>
      </div>

      <ReplayRoundSidebar
        sidebarOpen={sidebarState.rightSidebarOpen}
        setSidebarOpen={sidebarState.setRightSidebarOpen}
        players={match.players}
        round={round}
        clock={clock}
        viewerPuuid={match.viewer?.puuid}
        onSelectEvent={handleSelectEvent}
        warnings={match.warnings}
        replayId={replayId}
      />

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy this replay frame to a new lobby?</DialogTitle>
            <DialogDescription>
              Creates an editable lobby from the replay at the current moment,
              including any drawings you have added. The replay file stays
              untouched.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">What gets copied</p>
            <p>
              Map: {match.mapName} · Round {round.roundNumber} ·{" "}
              <ReplayMomentLabel clock={clock} />
            </p>
            <p>
              Current agent positions, vision cones, spike, and the latest kill
              line, plus your drawings and annotations.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}
              disabled={createLobbyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveToLobby}
              disabled={createLobbyMutation.isPending || !canSaveReplay}
            >
              {createLobbyMutation.isPending ? "Creating..." : "Copy to Lobby"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const formatSnapshotTime = (timeMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const ReplayMomentLabel = ({ clock }: { clock: ReplayClock }) => {
  const timeMs = useReplayClockStep(clock, 1000);

  return <>{formatSnapshotTime(timeMs)}</>;
};

const ReplayPlayerLoadingSkeleton = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="space-y-4 text-center">
      <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
      <p className="font-medium text-muted-foreground">Preparing replay...</p>
    </div>
  </div>
);
