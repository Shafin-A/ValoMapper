import { AnimatedContent } from "@/components/ui/animated-content";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanvas } from "@/contexts/canvas-context";
import { MAP_SIZE } from "@/lib/consts";
import { Tool } from "@/lib/types";
import { getNextId } from "@/lib/utils";
import { Vector2d } from "konva/lib/types";
import {
  ALargeSmall,
  Cloud,
  CloudCheck,
  CloudOff,
  Eraser,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Redo,
  Trash2,
  Undo,
} from "lucide-react";
import { useRef } from "react";
import { DeleteSettings } from "./delete-settings";
import { DrawSettings } from "./draw-settings";
import { EraserSettings } from "./eraser-settings";
import { toast } from "sonner";

interface ToolsSectionProps {
  mapPosition: Vector2d;
}

export const ToolsSection = ({ mapPosition }: ToolsSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    setIsDrawMode,
    tool,
    setTool,
    isDrawMode,
    isDeleteSettingsOpen,
    setIsDeleteSettingsOpen,
    setTextsOnCanvas,
    setEditingTextId,
    setImagesOnCanvas,
    saveCanvasState,
    hasUnsavedChanges,
    isUpdatingLobby,
    isErrorUpdatingLobby,
  } = useCanvas();

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

  const handleSyncCanvas = () => {
    saveCanvasState();
    toast.success("Canvas synced!");
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
      <div className="space-y-2 mt-4">
        <span className="text-base font-semibold block">Tools</span>
        <div className="grid grid-cols-5 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSyncCanvas}
                disabled={!hasUnsavedChanges || isUpdatingLobby}
                variant="ghost"
                size="lg"
                className="col-start-3"
              >
                {isUpdatingLobby ? (
                  <Loader2 className="animate-spin" />
                ) : isErrorUpdatingLobby ? (
                  <CloudOff className="text-destructive" />
                ) : hasUnsavedChanges ? (
                  <Cloud />
                ) : (
                  <CloudCheck />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              {isUpdatingLobby
                ? "Syncing..."
                : isErrorUpdatingLobby
                ? `Sync failed`
                : hasUnsavedChanges
                ? "Unsaved changes"
                : "All changes synced"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={undo}
                disabled={!canUndo}
                variant="ghost"
                size="lg"
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
                data-state={isDrawMode && tool === "eraser" ? "on" : "off"}
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
              <Button variant="ghost" size="lg" onClick={handleImageUpload}>
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
    </>
  );
};
