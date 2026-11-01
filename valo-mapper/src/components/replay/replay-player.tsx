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
import { useCanvas } from "@/contexts/canvas-context";
import { useCreateLobby } from "@/hooks/api/use-create-lobby";
import { useReplayPlayback } from "@/hooks/use-replay-playback";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { MAP_SIZE, SIDEBAR_WIDTH, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "@/lib/consts";
import {
  buildReplayInitialState,
  buildReplaySnapshotState,
  getActiveEventIndex,
  getReplayFrameAtTime,
  getReplayMapOption,
} from "@/lib/replay";
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
import { ReplayCanvasLayer } from "./replay-canvas-layer";
import { ReplayControlsBar } from "./replay-controls-bar";
import { ReplayRoundSidebar } from "./replay-round-sidebar";

const REPLAY_MAP_SIDE = "defense" as const;

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

  const {
    agentsSettings,
    abilitiesSettings,
    applyRemoteState,
    currentPhaseIndex,
    editedPhases,
    mapSide,
    phases,
    selectedMap,
  } = useCanvas();
  const createLobbyMutation = useCreateLobby();

  const firstRound = match.rounds[0];
  const [selectedRoundNumber, setSelectedRoundNumber] = useState(
    firstRound?.roundNumber ?? 1,
  );
  const [stageScale, setStageScale] = useState(1);
  const [isScaleReady, setIsScaleReady] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [hideDeadAgents, setHideDeadAgents] = useState(false);
  const [hideAgentWeapons, setHideAgentWeapons] = useState(false);
  const [hideWeaponHits, setHideWeaponHits] = useState(false);
  const [showVisionCones, setShowVisionCones] = useState(true);
  const [startAtBarrierDrop, setStartAtBarrierDrop] = useState(true);

  const round =
    match.rounds.find(
      (candidate) => candidate.roundNumber === selectedRoundNumber,
    ) ?? firstRound;

  useEffect(() => {
    setSelectedRoundNumber(firstRound?.roundNumber ?? 1);
  }, [firstRound?.roundNumber, replayId]);

  const { currentTimeMs, isPlaying, speed, seek, setSpeed, togglePlay } =
    useReplayPlayback({
      durationMs: round?.durationMs ?? 0,
      resetKey: `${replayId}:${round?.roundNumber ?? 0}`,
      startTimeMs: startAtBarrierDrop ? (round?.buyEndTimeMs ?? 0) : 0,
    });

  const frame = useMemo(
    () => (round ? getReplayFrameAtTime(round, currentTimeMs) : null),
    [currentTimeMs, round],
  );

  const selectedEventIndex = useMemo(
    () => (round ? getActiveEventIndex(round, currentTimeMs) : null),
    [currentTimeMs, round],
  );

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

      const scaleX = containerWidth / VIRTUAL_WIDTH;
      const scaleY = containerHeight / VIRTUAL_HEIGHT;

      setStageScale(Math.min(scaleX, scaleY));
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
  }, []);

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
      }),
      pendingToast: {
        type: "replay-save",
        roundNumber: round.roundNumber,
        timeMs: Math.round(currentTimeMs),
        replayId,
      },
    });
  }, [
    createLobbyMutation,
    currentState,
    currentTimeMs,
    frame,
    hideAgentWeapons,
    hideDeadAgents,
    mapSide,
    match,
    replayId,
    round,
    showVisionCones,
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

  const mapPosition = {
    x: (VIRTUAL_WIDTH - MAP_SIZE) / 2,
    y: (VIRTUAL_HEIGHT - MAP_SIZE) / 2,
  };

  const controlsInsetStyle = {
    "--replay-controls-left": `${sidebarState.leftSidebarOpen ? SIDEBAR_WIDTH : 0}px`,
    "--replay-controls-right": `${sidebarState.rightSidebarOpen ? SIDEBAR_WIDTH : 0}px`,
  } as CSSProperties;

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SiteHeader {...sidebarState} />

      <ToolsSidebar
        variant="replay"
        sidebarOpen={sidebarState.leftSidebarOpen}
        mapPosition={mapPosition}
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
                mapPosition={mapPosition}
                replayOverlay={
                  <ReplayCanvasLayer
                    match={match}
                    round={round}
                    frame={frame}
                    currentTimeMs={currentTimeMs}
                    mapSide={mapSide}
                    hideDeadAgents={hideDeadAgents}
                    hideAgentWeapons={hideAgentWeapons}
                    hideWeaponHits={hideWeaponHits}
                    showVisionCones={showVisionCones}
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
              currentTimeMs={currentTimeMs}
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
              startAtBarrierDrop={startAtBarrierDrop}
              onStartAtBarrierDropChange={setStartAtBarrierDrop}
            />
          </div>
        </div>
      </div>

      <ReplayRoundSidebar
        sidebarOpen={sidebarState.rightSidebarOpen}
        players={match.players}
        round={round}
        currentTimeMs={currentTimeMs}
        viewerPuuid={match.viewer?.puuid}
        selectedEventIndex={selectedEventIndex}
        onSelectEvent={handleSelectEvent}
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
              {formatSnapshotTime(currentTimeMs)}
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
              disabled={createLobbyMutation.isPending || !frame}
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

const ReplayPlayerLoadingSkeleton = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="space-y-4 text-center">
      <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
      <p className="font-medium text-muted-foreground">Preparing replay...</p>
    </div>
  </div>
);
