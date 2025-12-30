import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { MAP_OPTIONS, MAP_SIZE, SIDEBAR_WIDTH } from "@/lib/consts";
import { MapOption } from "@/lib/types";
import { Vector2d } from "konva/lib/types";
import { AlertCircle, Loader2, Info } from "lucide-react";
import { RefObject, Suspense } from "react";
import { useState } from "react";
import { MapStageHandle } from "@/components/canvas";
import { IconsSection } from "./icons-section";
import { MapSelect } from "./map-select-button";
import { ToolsSection } from "./tools-section";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface ToolsSidebarProps {
  sidebarOpen: boolean;
  mapPosition: Vector2d;
  stageRef?: RefObject<MapStageHandle | null>;
}

export const ToolsSidebar = ({
  sidebarOpen,
  mapPosition,
  stageRef,
}: ToolsSidebarProps) => {
  const {
    selectedMap,
    setSelectedMap,
    mapSide,
    setMapSide,
    resetState,
    setTextsOnCanvas,
    setImagesOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setToolIconsOnCanvas,
    setDrawLines,
    phases,
    currentPhaseIndex,
    switchToPhase,
    transitionToPhase,
    isTransitioning,
    editedPhases,
    isLoadingLobby,
    isErrorLobby,
  } = useCanvas();

  const { agentsSettings } = useSettings();

  const handleMapSelect = (option: MapOption) => {
    setSelectedMap(option);
    resetState(true);
  };

  const handleRotationToggle = () => {
    setAgentsOnCanvas((prev) =>
      prev.map((agent) => ({
        ...agent,
        x: 2 * (mapPosition.x + MAP_SIZE / 2) - agent.x,
        y: 2 * (mapPosition.y + MAP_SIZE / 2) - agent.y,
      }))
    );

    setAbilitiesOnCanvas((prev) =>
      prev.map((ability) => ({
        ...ability,
        x: 2 * (mapPosition.x + MAP_SIZE / 2) - ability.x,
        y: 2 * (mapPosition.y + MAP_SIZE / 2) - ability.y,
        currentRotation: ((ability.currentRotation || 0) + 180) % 360,
      }))
    );

    setTextsOnCanvas((prev) =>
      prev.map((text) => {
        const cx = text.x + text.width / 2;
        const cy = text.y + text.height / 2;

        const mapCenterX = mapPosition.x + MAP_SIZE / 2;
        const mapCenterY = mapPosition.y + MAP_SIZE / 2;

        const newCx = 2 * mapCenterX - cx;
        const newCy = 2 * mapCenterY - cy;

        return {
          ...text,
          x: newCx - text.width / 2,
          y: newCy - text.height / 2,
        };
      })
    );

    setImagesOnCanvas((prev) =>
      prev.map((image) => {
        const cx = image.x + image.width / 2;
        const cy = image.y + image.height / 2;
        const mapCenterX = mapPosition.x + MAP_SIZE / 2;
        const mapCenterY = mapPosition.y + MAP_SIZE / 2;

        const newCx = 2 * mapCenterX - cx;
        const newCy = 2 * mapCenterY - cy;

        return {
          ...image,
          x: newCx - image.width / 2,
          y: newCy - image.height / 2,
        };
      })
    );

    setDrawLines((prev) =>
      prev.map((line) => ({
        ...line,
        points: line.points.map((point) => ({
          x: 2 * (mapPosition.x + MAP_SIZE / 2) - point.x,
          y: 2 * (mapPosition.y + MAP_SIZE / 2) - point.y,
        })),
      }))
    );

    setToolIconsOnCanvas((prev) =>
      prev.map((toolIcon) => ({
        ...toolIcon,
        x: 2 * (mapPosition.x + MAP_SIZE / 2) - toolIcon.x,
        y: 2 * (mapPosition.y + MAP_SIZE / 2) - toolIcon.y,
      }))
    );
  };

  const [pendingPhaseIndex, setPendingPhaseIndex] = useState<number | null>(
    null
  );

  const handlePhaseSwitch = async (newIndex: number) => {
    if (isTransitioning.current) return;

    setPendingPhaseIndex(newIndex);

    const fromPhase = phases[currentPhaseIndex];
    const toPhase = phases[newIndex];

    if (editedPhases.has(newIndex)) {
      await transitionToPhase(fromPhase, toPhase, 200);
    }

    switchToPhase(newIndex);
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
            <span className="text-base font-semibold">Maps</span>
            <MapSelect
              mapOptions={MAP_OPTIONS}
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
                  {Array.from({ length: 10 }, (_, i) => {
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
