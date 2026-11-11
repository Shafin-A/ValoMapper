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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { phaseHasContent } from "@/hooks/canvas/use-phase-manager";
import { useSettings } from "@/contexts/settings-context";
import { MAP_OPTIONS, DEFAULT_MAP_OPTIONS, SIDEBAR_WIDTH } from "@/lib/consts";
import { cn } from "@/lib/utils";
import { MatchEventLog } from "@/components/matches/match-event-log";
import { MatchRoundSelector } from "@/components/matches/match-round-selector";
import { Checkbox } from "@/components/ui/checkbox";
import { CanvasBackground, MapOption } from "@/lib/types";
import type { MatchPlayers, MatchRound } from "@/lib/matches";
import { Vector2d } from "konva/lib/types";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import {
  Dispatch,
  RefObject,
  SetStateAction,
  Suspense,
  useEffect,
} from "react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MapStageHandle } from "@/components/canvas";
import { IconsSection } from "./icons-section";
import { MapSelect } from "./map-select-button";
import { ToolsSection, type ToolsSectionAction } from "./tools-section";
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
import { InfoHint } from "@/components/shared/info-hint";

interface MatchReviewControls {
  mapName: string;
  queueLabel?: string;
  rounds: MatchRound[];
  selectedRoundNumber: number;
  currentPlayerTeamId?: string;
  currentPlayerBestRoundNumber?: number;
  selectedEventIndex: number | null;
  players: MatchPlayers;
  currentPlayerPuuid?: string;
  onSelectRound: (roundNumber: number) => void;
  onSelectEvent: (eventIndex: number) => void;
}

type ToolsSidebarVariant = "lobby" | "match-review" | "replay";

interface ToolsSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen?: Dispatch<SetStateAction<boolean>>;
  mapPosition: Vector2d;
  stageRef?: RefObject<MapStageHandle | null>;
  reviewControls?: MatchReviewControls;
  saveAction?: ToolsSectionAction;
  variant?: ToolsSidebarVariant;
  showBackgroundSettings?: boolean;
}

interface PhaseButtonProps {
  phaseNumber: number;
  shortcut?: "A" | "D";
  isEdited: boolean;
  hasContent: boolean;
  isSelected: boolean;
}

const PhaseButton = ({
  phaseNumber,
  shortcut,
  isEdited,
  hasContent,
  isSelected,
}: PhaseButtonProps) => {
  const editLabel = isEdited
    ? hasContent
      ? " (edited)"
      : " (empty step)"
    : "";

  const tooltipText =
    shortcut ??
    (isEdited ? (hasContent ? "Edited" : "Empty step") : undefined);

  const button = (
    <ToggleGroupItem
      value={phaseNumber.toString()}
      aria-label={`Phase ${phaseNumber}${editLabel}`}
      className="relative"
    >
      {phaseNumber}
      {isEdited && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute right-1 top-1 size-1.5 rounded-full",
            hasContent
              ? "bg-current opacity-70"
              : "border border-current opacity-60",
          )}
        />
      )}
    </ToggleGroupItem>
  );

  if (isSelected || !tooltipText) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
};

export const ToolsSidebar = ({
  sidebarOpen,
  setSidebarOpen,
  mapPosition,
  stageRef,
  reviewControls,
  saveAction,
  variant = "lobby",
  showBackgroundSettings = false,
}: ToolsSidebarProps) => {
  const isMobile = useIsMobile();
  const isReplayVariant = variant === "replay";
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
    canvasBackground,
    setCanvasBackground,
    notifyPhaseChangedCallback,
    rotateCanvasItemsForSideSwap,
  } = useCanvas();

  const { agentsSettings } = useSettings();
  const { notifyPhaseChanged, notifyAllPhasesRotated } =
    useCollaborativeCanvas();
  const [mapSettingsOpen, setMapSettingsOpen] = useState(false);
  const [showAllMaps, setShowAllMaps] = useState(false);
  const [isReviewSheetOpen, setIsReviewSheetOpen] = useState(false);

  useEffect(() => {
    notifyPhaseChangedCallback.current = notifyPhaseChanged;
    return () => {
      notifyPhaseChangedCallback.current = null;
    };
  }, [notifyPhaseChanged, notifyPhaseChangedCallback]);

  const handleMapSelect = (option: MapOption) => {
    setSelectedMap(option);
    resetState(true);
    if (isMobile) {
      setSidebarOpen?.(false);
    }
  };

  const handleRotationToggle = () => {
    rotateCanvasItemsForSideSwap((newPhases) => {
      notifyAllPhasesRotated(newPhases);
    });
  };

  const [pendingPhaseIndex, setPendingPhaseIndex] = useState<number | null>(
    null,
  );

  const selectedReviewRoundIndex = reviewControls
    ? reviewControls.rounds.findIndex(
        (round) => round.roundNumber === reviewControls.selectedRoundNumber,
      )
    : -1;
  const selectedReviewRound =
    reviewControls && selectedReviewRoundIndex >= 0
      ? reviewControls.rounds[selectedReviewRoundIndex]
      : null;
  const hasPreviousReviewRound = selectedReviewRoundIndex > 0;
  const hasNextReviewRound =
    reviewControls != null &&
    selectedReviewRoundIndex >= 0 &&
    selectedReviewRoundIndex < reviewControls.rounds.length - 1;

  const handleReviewRoundStep = (direction: -1 | 1) => {
    if (!reviewControls || selectedReviewRoundIndex < 0) {
      return;
    }

    const nextRound =
      reviewControls.rounds[selectedReviewRoundIndex + direction];
    if (!nextRound) {
      return;
    }

    reviewControls.onSelectRound(nextRound.roundNumber);
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

  const activePhaseIndex = pendingPhaseIndex ?? currentPhaseIndex;

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
              <div className="flex items-center gap-1">
                <Popover
                  open={mapSettingsOpen}
                  onOpenChange={setMapSettingsOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 sm:h-6 sm:w-6"
                      aria-label="Map settings"
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
                      {showBackgroundSettings && (
                        <div className="space-y-2 border-t pt-3">
                          <Label htmlFor="canvas-background" className="text-sm">
                            Background
                          </Label>
                          <Select
                            value={canvasBackground}
                            onValueChange={(value) =>
                              setCanvasBackground(value as CanvasBackground)
                            }
                          >
                            <SelectTrigger
                              id="canvas-background"
                              className="w-full"
                            >
                              <SelectValue placeholder="Select a background" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="dots">Dots</SelectItem>
                              <SelectItem value="grid">Grid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
                </Popover>
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label="Close maps sidebar"
                    onClick={() => setSidebarOpen?.(false)}
                  >
                    <X />
                  </Button>
                )}
              </div>
            </div>
            {isReplayVariant ? (
              <MapSelect
                readOnly
                mapOptions={[selectedMap]}
                selectedMap={selectedMap}
                setSelectedMap={setSelectedMap}
                allyColor={agentsSettings.allyColor}
                enemyColor={agentsSettings.enemyColor}
                mapSide={mapSide}
                setMapSide={setMapSide}
                onMapRotate={handleRotationToggle}
              />
            ) : (
              <>
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
              </>
            )}
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
              {!isReplayVariant && reviewControls && selectedReviewRound && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold">Rounds</span>
                  </div>

                  <div className="grid grid-cols-[auto_1fr_auto] gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 border-slate-700 bg-slate-950 text-white hover:bg-slate-900"
                      onClick={() => handleReviewRoundStep(-1)}
                      disabled={!hasPreviousReviewRound}
                      aria-label="Select previous round"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Sheet
                      open={isReviewSheetOpen}
                      onOpenChange={setIsReviewSheetOpen}
                    >
                      <SheetTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 justify-center border-slate-700 bg-slate-950 px-4 text-center text-base font-semibold text-white hover:bg-slate-900"
                        >
                          Round {reviewControls.selectedRoundNumber}
                        </Button>
                      </SheetTrigger>

                      <SheetContent
                        side="left"
                        className="gap-0 border-slate-800 bg-slate-950 px-0 text-white w-[min(420px,calc(100vw-1rem))] max-w-[420px] sm:max-w-[420px]"
                      >
                        <SheetHeader className="border-b border-slate-800 px-5 py-4 text-left">
                          <div className="pr-8">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
                              Match Review
                            </p>
                            <SheetTitle className="mt-1 text-lg text-white">
                              {reviewControls.mapName} • Round{" "}
                              {reviewControls.selectedRoundNumber}
                            </SheetTitle>
                            <SheetDescription className="text-white/60">
                              Browse rounds and review events.
                            </SheetDescription>
                          </div>
                        </SheetHeader>

                        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 py-4">
                          <MatchRoundSelector
                            rounds={reviewControls.rounds}
                            selectedRoundNumber={
                              reviewControls.selectedRoundNumber
                            }
                            currentPlayerTeamId={
                              reviewControls.currentPlayerTeamId
                            }
                            currentPlayerBestRoundNumber={
                              reviewControls.currentPlayerBestRoundNumber
                            }
                            queueLabel={reviewControls.queueLabel}
                            onSelectRound={reviewControls.onSelectRound}
                          />

                          <MatchEventLog
                            containerClassName="h-auto min-h-0 flex-1 md:h-auto"
                            scrollAreaClassName="h-full md:h-full"
                            events={selectedReviewRound.eventLog}
                            players={reviewControls.players}
                            currentPlayerPuuid={
                              reviewControls.currentPlayerPuuid
                            }
                            selectedEventIndex={
                              reviewControls.selectedEventIndex
                            }
                            onSelectEvent={reviewControls.onSelectEvent}
                          />
                        </div>
                      </SheetContent>
                    </Sheet>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 border-slate-700 bg-slate-950 text-white hover:bg-slate-900"
                      onClick={() => handleReviewRoundStep(1)}
                      disabled={!hasNextReviewRound}
                      aria-label="Select next round"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {!isReplayVariant && (
              <div className="space-y-2 mt-4" data-tour="phases">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">Phases</span>
                  <InfoHint label="About phases">
                    <div className="space-y-2">
                      {isMobile ? (
                        <p>
                          Tap a phase number to switch phases. Build your
                          strategy step by step by placing agents and abilities
                          at different phases.
                        </p>
                      ) : (
                        <>
                          <p>
                            Press A and D to switch back and forth between
                            phases
                          </p>
                          <p>
                            Use Phases to build out and detail your strategy
                            step by step by placing agents and abilites at
                            different phases
                          </p>
                        </>
                      )}
                    </div>
                  </InfoHint>
                </div>
                <ToggleGroup
                  type="single"
                  className="grid grid-cols-5 gap-2 w-full"
                  defaultValue="1"
                  value={(activePhaseIndex + 1).toString()}
                  onValueChange={(value) => {
                    if (value) {
                      handlePhaseSwitch(Number(value) - 1);
                    }
                  }}
                  rounded
                >
                  {phases.map((phase, i) => {
                    const phaseNum = i + 1;
                    const isPrevious = phaseNum === currentPhaseIndex;
                    const isNext = phaseNum === currentPhaseIndex + 2;
                    const isEdited = editedPhases.has(i);

                    return (
                      <PhaseButton
                        key={phaseNum}
                        phaseNumber={phaseNum}
                        shortcut={isPrevious ? "A" : isNext ? "D" : undefined}
                        isEdited={isEdited}
                        hasContent={phaseHasContent(phase)}
                        isSelected={i === activePhaseIndex}
                      />
                    );
                  })}
                </ToggleGroup>
              </div>
              )}
              <ToolsSection
                mapPosition={mapPosition}
                stageRef={stageRef}
                saveAction={saveAction}
              />
              <IconsSection setSidebarOpen={setSidebarOpen} />
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
