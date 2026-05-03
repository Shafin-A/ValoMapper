import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { useSettings } from "@/contexts/settings-context";
import { MAP_OPTIONS, DEFAULT_MAP_OPTIONS, SIDEBAR_WIDTH } from "@/lib/consts";
import { MatchEventLog } from "@/components/matches/match-event-log";
import { MatchRoundSelector } from "@/components/matches/match-round-selector";
import { Checkbox } from "@/components/ui/checkbox";
import { MapOption } from "@/lib/types";
import type { MatchPlayers, MatchRound } from "@/lib/matches";
import { Vector2d } from "konva/lib/types";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { RefObject, Suspense, useEffect } from "react";
import { useState } from "react";
import { MapStageHandle } from "@/components/canvas";
import { IconsSection } from "./icons-section";
import { MapSelect } from "./map-select-button";
import { ToolsSection } from "./tools-section";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReplayControls {
  mapName: string;
  rounds: MatchRound[];
  selectedRoundNumber: number;
  currentPlayerTeamId?: string;
  currentPlayerBestRoundNumber?: number;
  selectedEventIndex: number | null;
  players: MatchPlayers;
  currentPlayerPuuid?: string;
  onSelectRound: (roundNumber: number) => void;
  onSelectEvent: (eventIndex: number) => void;
  backHref?: string;
}

interface ToolsSidebarProps {
  sidebarOpen: boolean;
  mapPosition: Vector2d;
  stageRef?: RefObject<MapStageHandle | null>;
  replayControls?: ReplayControls;
}

export const ToolsSidebar = ({
  sidebarOpen,
  mapPosition,
  stageRef,
  replayControls,
}: ToolsSidebarProps) => {
  const {
    selectedMap,
    setSelectedMap,
    mapSide,
    setMapSide,
    resetState,
    phases,
    currentPhaseIndex,
    switchToPhase,
    transitionToPhase,
    isTransitioning,
    editedPhases,
    isLoadingLobby,
    isErrorLobby,
    showCallouts,
    setShowCallouts,
    showUltOrbs,
    setShowUltOrbs,
    showSpawnBarriers,
    setShowSpawnBarriers,
    notifyPhaseChangedCallback,
    rotateCanvasItemsForSideSwap,
  } = useCanvas();

  const { agentsSettings } = useSettings();
  const { notifyPhaseChanged, notifyAllPhasesRotated } =
    useCollaborativeCanvas();
  const [mapSettingsOpen, setMapSettingsOpen] = useState(false);
  const [showAllMaps, setShowAllMaps] = useState(false);
  const [isReplaySheetOpen, setIsReplaySheetOpen] = useState(false);

  useEffect(() => {
    notifyPhaseChangedCallback.current = notifyPhaseChanged;
    return () => {
      notifyPhaseChangedCallback.current = null;
    };
  }, [notifyPhaseChanged, notifyPhaseChangedCallback]);

  const handleMapSelect = (option: MapOption) => {
    setSelectedMap(option);
    resetState(true);
  };

  const handleRotationToggle = () => {
    rotateCanvasItemsForSideSwap((newPhases) => {
      notifyAllPhasesRotated(newPhases);
    });
  };

  const [pendingPhaseIndex, setPendingPhaseIndex] = useState<number | null>(
    null,
  );

  const selectedReplayRoundIndex = replayControls
    ? replayControls.rounds.findIndex(
        (round) => round.roundNumber === replayControls.selectedRoundNumber,
      )
    : -1;
  const selectedReplayRound =
    replayControls && selectedReplayRoundIndex >= 0
      ? replayControls.rounds[selectedReplayRoundIndex]
      : null;
  const hasPreviousReplayRound = selectedReplayRoundIndex > 0;
  const hasNextReplayRound =
    replayControls != null &&
    selectedReplayRoundIndex >= 0 &&
    selectedReplayRoundIndex < replayControls.rounds.length - 1;

  const handleReplayRoundStep = (direction: -1 | 1) => {
    if (!replayControls || selectedReplayRoundIndex < 0) {
      return;
    }

    const nextRound =
      replayControls.rounds[selectedReplayRoundIndex + direction];
    if (!nextRound) {
      return;
    }

    replayControls.onSelectRound(nextRound.roundNumber);
  };

  const handlePhaseSwitch = async (newIndex: number) => {
    if (isTransitioning.current) return;

    setPendingPhaseIndex(newIndex);

    const fromPhase = phases[currentPhaseIndex];
    const toPhase = phases[newIndex];

    if (editedPhases.has(newIndex)) {
      await transitionToPhase(fromPhase, toPhase, 200);
    }

    switchToPhase(newIndex);
    notifyPhaseChanged(newIndex);
    setPendingPhaseIndex(null);
  };

  return (
    <SidebarProvider
      style={{
        ["--sidebar-width" as keyof React.CSSProperties]: `${SIDEBAR_WIDTH}px`,
        ["--sidebar-width-mobile" as keyof React.CSSProperties]: `${SIDEBAR_WIDTH}px`,
      }}
      open={sidebarOpen}
    >
      <Sidebar
        className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
        collapsible="offcanvas"
        side="left"
      >
        <SidebarHeader>
          <div className="flex flex-col gap-3 p-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">Maps</span>
              <Popover open={mapSettingsOpen} onOpenChange={setMapSettingsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={isLoadingLobby || isErrorLobby}
                  >
                    <Settings
                      className={`h-4 w-4 transition-transform duration-300 ${
                        mapSettingsOpen ? "rotate-90" : ""
                      }`}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Map Settings</h4>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-callouts" className="text-sm">
                          Show Map Callouts
                        </Label>
                        <Switch
                          id="show-callouts"
                          checked={showCallouts}
                          onCheckedChange={setShowCallouts}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="show-spawn-barriers"
                          className="text-sm"
                        >
                          Show Spawn Barriers
                        </Label>
                        <Switch
                          id="show-spawn-barriers"
                          checked={showSpawnBarriers}
                          onCheckedChange={setShowSpawnBarriers}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-ult-orbs" className="text-sm">
                          Show Ult Orbs
                        </Label>
                        <Switch
                          id="show-ult-orbs"
                          checked={showUltOrbs}
                          onCheckedChange={setShowUltOrbs}
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <MapSelect
              mapOptions={showAllMaps ? MAP_OPTIONS : DEFAULT_MAP_OPTIONS}
              selectedMap={selectedMap}
              setSelectedMap={setSelectedMap}
              onMapSelect={handleMapSelect}
              allyColor={agentsSettings.allyColor}
              enemyColor={agentsSettings.enemyColor}
              mapSide={mapSide}
              setMapSide={setMapSide}
              onMapRotate={handleRotationToggle}
              disabled={isLoadingLobby || isErrorLobby}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-all-maps"
                checked={showAllMaps}
                onCheckedChange={(checked) => setShowAllMaps(checked === true)}
                disabled={isLoadingLobby || isErrorLobby}
              />
              <Label
                htmlFor="show-all-maps"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                All maps
              </Label>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-4 pb-4 relative">
          <Suspense fallback={<ToolsSidebarLoadingSkeleton />}>
            <div
              className={
                isLoadingLobby || isErrorLobby
                  ? "pointer-events-none opacity-50"
                  : ""
              }
            >
              {replayControls && selectedReplayRound && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold">Rounds</span>
                    {replayControls.backHref && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={replayControls.backHref}>
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Link>
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-[auto_1fr_auto] gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 border-slate-700 bg-slate-950 text-white hover:bg-slate-900"
                      onClick={() => handleReplayRoundStep(-1)}
                      disabled={!hasPreviousReplayRound}
                      aria-label="Select previous round"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Sheet
                      open={isReplaySheetOpen}
                      onOpenChange={setIsReplaySheetOpen}
                    >
                      <SheetTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 justify-between border-slate-700 bg-slate-950 px-4 text-left text-white hover:bg-slate-900"
                        >
                          <span className="text-base font-semibold">
                            Round {replayControls.selectedRoundNumber}
                          </span>
                          <span className="text-xs uppercase tracking-[0.12em] text-white/55">
                            {selectedReplayRound.eventLog.length} events
                          </span>
                        </Button>
                      </SheetTrigger>

                      <SheetContent
                        side="left"
                        className="gap-0 border-slate-800 bg-slate-950 px-0 text-white w-[min(420px,calc(100vw-1rem))] max-w-[420px] sm:max-w-[420px]"
                      >
                        <SheetHeader className="border-b border-slate-800 px-5 py-4 text-left">
                          <div className="pr-8">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
                              Match Replay
                            </p>
                            <SheetTitle className="mt-1 text-lg text-white">
                              {replayControls.mapName} • Round{" "}
                              {replayControls.selectedRoundNumber}
                            </SheetTitle>
                            <SheetDescription className="text-white/60">
                              Browse rounds and replay events.
                            </SheetDescription>
                          </div>
                        </SheetHeader>

                        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 py-4">
                          <MatchRoundSelector
                            rounds={replayControls.rounds}
                            selectedRoundNumber={
                              replayControls.selectedRoundNumber
                            }
                            currentPlayerTeamId={
                              replayControls.currentPlayerTeamId
                            }
                            currentPlayerBestRoundNumber={
                              replayControls.currentPlayerBestRoundNumber
                            }
                            onSelectRound={replayControls.onSelectRound}
                          />

                          <MatchEventLog
                            containerClassName="h-auto min-h-0 flex-1 md:h-auto"
                            scrollAreaClassName="h-full md:h-full"
                            events={selectedReplayRound.eventLog}
                            players={replayControls.players}
                            currentPlayerPuuid={
                              replayControls.currentPlayerPuuid
                            }
                            selectedEventIndex={
                              replayControls.selectedEventIndex
                            }
                            onSelectEvent={replayControls.onSelectEvent}
                          />
                        </div>
                      </SheetContent>
                    </Sheet>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 border-slate-700 bg-slate-950 text-white hover:bg-slate-900"
                      onClick={() => handleReplayRoundStep(1)}
                      disabled={!hasNextReplayRound}
                      aria-label="Select next round"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2 mt-4" data-tour="phases">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">Phases</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="inline-flex items-center justify-center"
                        type="button"
                      >
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-2">
                        <p>
                          Press A and D to switch back and forth between phases
                        </p>
                        <p>
                          Use Phases to build out and detail your strategy step
                          by step by placing agents and abilites at different
                          phases
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <ToggleGroup
                  type="single"
                  className="grid grid-cols-5 gap-2 w-full"
                  defaultValue="1"
                  value={(
                    (pendingPhaseIndex ?? currentPhaseIndex) + 1
                  ).toString()}
                  onValueChange={(value) => {
                    if (value) {
                      handlePhaseSwitch(Number(value) - 1);
                    }
                  }}
                  rounded
                >
                  {phases.map((_, i) => {
                    const phaseNum = i + 1;
                    const isPrevious = phaseNum === currentPhaseIndex;
                    const isNext = phaseNum === currentPhaseIndex + 2;

                    if (isPrevious) {
                      return (
                        <Tooltip key={phaseNum}>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem value={phaseNum.toString()}>
                              {phaseNum}
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>A</TooltipContent>
                        </Tooltip>
                      );
                    }

                    if (isNext) {
                      return (
                        <Tooltip key={phaseNum}>
                          <TooltipTrigger asChild>
                            <ToggleGroupItem value={phaseNum.toString()}>
                              {phaseNum}
                            </ToggleGroupItem>
                          </TooltipTrigger>
                          <TooltipContent>D</TooltipContent>
                        </Tooltip>
                      );
                    }

                    return (
                      <ToggleGroupItem
                        key={phaseNum}
                        value={phaseNum.toString()}
                      >
                        {phaseNum}
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
              </div>
              <ToolsSection mapPosition={mapPosition} stageRef={stageRef} />
              <IconsSection mapPosition={mapPosition} />
            </div>
          </Suspense>

          {isLoadingLobby && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Loading tools...
              </span>
            </div>
          )}

          {isErrorLobby && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center bg-background/80 backdrop-blur-sm">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  Failed to load lobby
                </span>
                <span className="text-xs text-muted-foreground">
                  Please try again later
                </span>
              </div>
            </div>
          )}
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
};

const ToolsSidebarLoadingSkeleton = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">Loading tools...</span>
    </div>
  );
};
