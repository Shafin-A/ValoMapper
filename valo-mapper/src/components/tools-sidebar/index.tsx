import { AnimatedContent } from "@/components/ui/animated-content";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanvas } from "@/contexts/canvas-context";
import { MAP_OPTIONS, MAP_SIZE, SIDEBAR_WIDTH } from "@/lib/consts";
import { MapOption, Tool } from "@/lib/types";
import {
  ALargeSmall,
  Eraser,
  Image as ImageIcon,
  Pencil,
  Redo,
  Trash2,
  Undo,
} from "lucide-react";
import { DrawSettings } from "./draw-settings";
import { MapSelectButton } from "./map-select-button";
import { EraserSettings } from "./eraser-settings";
import { getNextId } from "@/lib/utils";
import { Vector2d } from "konva/lib/types";

interface ToolsSidebarProps {
  sidebarOpen: boolean;
  mapPosition: Vector2d;
}

export const ToolsSidebar = ({
  sidebarOpen,
  mapPosition,
}: ToolsSidebarProps) => {
  const {
    selectedMap,
    setSelectedMap,
    undo,
    redo,
    canUndo,
    canRedo,
    resetState,
    setIsDrawMode,
    tool,
    setTool,
    isDrawMode,
    setTextsOnCanvas,
  } = useCanvas();

  const handleMapSelect = (option: MapOption) => {
    setSelectedMap(option);
    resetState();
  };

  const handlePressedChange = (pressed: boolean, tool: Tool) => {
    setIsDrawMode(pressed);
    if (pressed) {
      setTool(tool);
    }
  };

  const handleAddText = () =>
    setTextsOnCanvas((prev) => [
      ...prev,
      {
        text: "Click to edit...",
        x: mapPosition.x + MAP_SIZE / 2 + Math.round(Math.random() * 10),
        y: mapPosition.y + MAP_SIZE / 2 + Math.round(Math.random() * 10),
        width: 150,
        id: getNextId("text"),
      },
    ]);

  return (
    <SidebarProvider
      style={{
        ["--sidebar-width" as keyof React.CSSProperties]: SIDEBAR_WIDTH,
        ["--sidebar-width-mobile" as keyof React.CSSProperties]: SIDEBAR_WIDTH,
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
            <MapSelectButton
              mapOptions={MAP_OPTIONS}
              selectedMap={selectedMap}
              setSelectedMap={setSelectedMap}
              onMapSelect={handleMapSelect}
            />
          </div>
        </SidebarHeader>

        <SidebarContent className="px-4 pb-4">
          <div className="space-y-2 mt-4">
            <span className="text-base font-semibold block">Tools</span>
            <div className="grid grid-cols-5 gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={undo}
                    disabled={!canUndo}
                    variant="ghost"
                    size="lg"
                    className="col-start-4" // Push undo button to the right
                  >
                    <Undo />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  Undo
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={redo}
                    disabled={!canRedo}
                    variant="ghost"
                    size="lg"
                  >
                    <Redo />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  Redo
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="lg"
                    data-state={isDrawMode && tool === "pencil" ? "on" : "off"}
                    pressed={isDrawMode && tool === "pencil"}
                    onPressedChange={(pressed) =>
                      handlePressedChange(pressed, "pencil")
                    }
                  >
                    <Pencil />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  Draw
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    size="lg"
                    data-state={isDrawMode && tool === "eraser" ? "on" : "off"}
                    pressed={isDrawMode && tool === "eraser"}
                    onPressedChange={(pressed) =>
                      handlePressedChange(pressed, "eraser")
                    }
                  >
                    <Eraser />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  Eraser
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="destructiveGhost" size="lg">
                    <Trash2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  Delete
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="lg" onClick={handleAddText}>
                    <ALargeSmall />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  Add Text
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="lg">
                    <ImageIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  Add Image
                </TooltipContent>
              </Tooltip>
            </div>
            <AnimatedContent show={isDrawMode && tool === "pencil"}>
              <DrawSettings />
            </AnimatedContent>

            <AnimatedContent show={isDrawMode && tool === "eraser"}>
              <EraserSettings />
            </AnimatedContent>
          </div>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
};
