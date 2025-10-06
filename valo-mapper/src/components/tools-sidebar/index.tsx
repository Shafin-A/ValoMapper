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
import { getNextId } from "@/lib/utils";
import { Vector2d } from "konva/lib/types";
import {
  ALargeSmall,
  Eraser,
  Image as ImageIcon,
  Pencil,
  Redo,
  Trash2,
  Undo,
} from "lucide-react";
import { useRef } from "react";
import { DeleteSettings } from "./delete-settings";
import { DrawSettings } from "./draw-settings";
import { EraserSettings } from "./eraser-settings";
import { MapSelect } from "./map-select-button";
import { useSettings } from "@/contexts/settings-context";

interface ToolsSidebarProps {
  sidebarOpen: boolean;
  mapPosition: Vector2d;
}

export const ToolsSidebar = ({
  sidebarOpen,
  mapPosition,
}: ToolsSidebarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    selectedMap,
    setSelectedMap,
    mapSide,
    setMapSide,
    undo,
    redo,
    canUndo,
    canRedo,
    resetState,
    setIsDrawMode,
    tool,
    setTool,
    isDrawMode,
    isDeleteSettingsOpen,
    setIsDeleteSettingsOpen,
    setTextsOnCanvas,
    setEditingTextId,
    setImagesOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setDrawLines,
    abilitiesOnCanvas,
  } = useCanvas();

  console.log(abilitiesOnCanvas);
  const { agentsSettings } = useSettings();

  const handleMapSelect = (option: MapOption) => {
    setSelectedMap(option);
    resetState();
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
  };

  const handleDrawPressedChange = (pressed: boolean, tool: Tool) => {
    setIsDeleteSettingsOpen(false);
    setIsDrawMode(pressed);
    if (pressed) {
      setTool(tool);
      setEditingTextId(null);
    }
  };

  const handleDeletePressedChange = (pressed: boolean) => {
    setIsDrawMode(false);
    setIsDeleteSettingsOpen(pressed);
  };

  const handleAddText = () => {
    setEditingTextId(null);
    setIsDrawMode(false);

    setTextsOnCanvas((prev) => [
      ...prev,
      {
        id: getNextId("text"),
        text: "",
        x: mapPosition.x + MAP_SIZE / 2 + Math.round(Math.random() * 20),
        y: mapPosition.y + MAP_SIZE / 2 + Math.round(Math.random() * 20),
        width: 200,
        height: 60,
      },
    ]);
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 500;
        let width = img.width;
        let height = img.height;

        if (width >= height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > width && height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        setImagesOnCanvas((prev) => [
          ...prev,
          {
            id: getNextId("image"),
            src: e.target?.result as string,
            x: mapPosition.x + MAP_SIZE / 2 + Math.round(Math.random() * 20),
            y: mapPosition.y + MAP_SIZE / 2 + Math.round(Math.random() * 20),
            width,
            height,
          },
        ]);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    event.target.value = "";
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
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
                      data-state={
                        isDrawMode && tool === "pencil" ? "on" : "off"
                      }
                      pressed={isDrawMode && tool === "pencil"}
                      onPressedChange={(pressed) =>
                        handleDrawPressedChange(pressed, "pencil")
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
                      data-state={
                        isDrawMode && tool === "eraser" ? "on" : "off"
                      }
                      pressed={isDrawMode && tool === "eraser"}
                      onPressedChange={(pressed) =>
                        handleDrawPressedChange(pressed, "eraser")
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
                    <Toggle
                      size="lg"
                      variant="destructive"
                      data-state={isDeleteSettingsOpen ? "on" : "off"}
                      pressed={isDeleteSettingsOpen}
                      onPressedChange={handleDeletePressedChange}
                    >
                      <Trash2 />
                    </Toggle>
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
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={handleImageUpload}
                    >
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

              <AnimatedContent show={isDeleteSettingsOpen}>
                <DeleteSettings />
              </AnimatedContent>
            </div>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </>
  );
};
