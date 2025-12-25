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
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from "@/lib/consts/misc/consts";
import { Tool } from "@/lib/types";
import { getNextId } from "@/lib/utils";
import { Vector2d } from "konva/lib/types";
import {
  ALargeSmall,
  Camera,
  Cloud,
  CloudCheck,
  CloudOff,
  Eraser,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Redo,
  Save,
  Scan,
  Trash2,
  Undo,
  Info,
} from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { DeleteSettings } from "./delete-settings";
import { DrawSettings } from "./draw-settings";
import { EraserSettings } from "./eraser-settings";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import TreeViewDialogContent from "../strategies/tree-view-dialog-content";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { MapStageHandle } from "@/components/canvas";
import { RefObject } from "react";
import { Group } from "konva/lib/Group";

interface ToolsSectionProps {
  mapPosition: Vector2d;
  stageRef?: RefObject<MapStageHandle | null>;
}

export const ToolsSection = ({ mapPosition, stageRef }: ToolsSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [openSaveDialog, setOpenSaveDialog] = useState(false);

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
    recenterCanvasCallback,
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

  const handleRecenterCanvas = useCallback(() => {
    const stageHandle = stageRef?.current;
    if (!stageHandle) return;

    const stage = stageHandle.stage;
    if (!stage) return;

    const container = stage.container();
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    const scaleX = containerWidth / VIRTUAL_WIDTH;
    const scaleY = containerHeight / VIRTUAL_HEIGHT;
    const baseScale = Math.min(scaleX, scaleY);

    const scaledWidth = VIRTUAL_WIDTH * baseScale;
    const scaledHeight = VIRTUAL_HEIGHT * baseScale;

    const x = (containerWidth - scaledWidth) / 2;
    const y = (containerHeight - scaledHeight) / 2;

    stage.position({ x, y });
    stage.scale({ x: baseScale, y: baseScale });
    stage.batchDraw();

    stageHandle.handleDragMove();
  }, [stageRef]);

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
  };

  const handleScreenshot = () => {
    const stageHandle = stageRef?.current;
    if (!stageHandle) return;

    const stage = stageHandle.stage;
    if (!stage) return;

    try {
      const layers = stage.getLayers();

      const drawLayer = layers.find((layer) => {
        const children = layer.getChildren();
        return children.some(
          (child) => child.getClassName() === "Group" && child.opacity() === 0.5
        );
      });

      let deleteZone: Group | null = null;
      if (drawLayer) {
        deleteZone = drawLayer
          .getChildren()
          .find(
            (child) =>
              child.getClassName() === "Group" && child.opacity() === 0.5
          ) as Group | null;

        if (deleteZone) {
          deleteZone.hide();
        }
      }

      const currentPosition = stage.position();
      const currentScale = stage.scale();

      stage.position({ x: 0, y: 0 });
      stage.scale({ x: 1, y: 1 });

      const dataURL = stage.toDataURL({
        x: 0,
        y: 0,
        width: VIRTUAL_WIDTH,
        height: VIRTUAL_HEIGHT,
        pixelRatio: 2,
        mimeType: "image/png",
      });

      stage.position(currentPosition);
      stage.scale(currentScale);

      if (deleteZone) {
        deleteZone.show();
      }

      stage.batchDraw();

      const now = new Date();
      const date = now.toISOString().split("T")[0];
      const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
      const filename = `valomapper-${date}-${time}.png`;
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Screenshot saved successfully!", {
        description: filename,
      });
    } catch (error) {
      console.error("Failed to save screenshot:", error);
      toast.error("Failed to save screenshot", {
        description: "Please try again.",
      });
    }
  };

  const { user } = useFirebaseAuth();

  const isAuthenticated = user !== null;

  useEffect(() => {
    recenterCanvasCallback.current = handleRecenterCanvas;
    return () => {
      recenterCanvasCallback.current = null;
    };
  }, [handleRecenterCanvas, recenterCanvasCallback]);

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
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">Tools</span>
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
              <div className="space-y-1">
                <p>Press Q to enter draw mode </p>
                <p>Press W to enter erase mode </p>
                <p>Press E while hovering an element to delete it</p>
                <p>Press R to recenter the canvas</p>
                <p>Press Ctrl+Z/Ctrl+Shift+Z to undo/redo</p>
              </div>
              <div className="mt-2">
                <p>
                  Add text, images, and drawings here. Also recenter the view,
                  screenshot the canvas, save to folders, sync changes to the
                  lobby, or undo/redo any action.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="grid grid-cols-5 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="lg"
                onClick={handleRecenterCanvas}
                disabled={!stageRef}
              >
                <Scan />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              Recenter Canvas (R)
            </TooltipContent>
          </Tooltip>
          <Dialog open={openSaveDialog} onOpenChange={setOpenSaveDialog}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="col-start-2"
                    disabled={isUpdatingLobby || !isAuthenticated}
                  >
                    <Save />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                {isUpdatingLobby
                  ? "Syncing..."
                  : !isAuthenticated
                  ? "Log in to save"
                  : "Save"}
              </TooltipContent>
            </Tooltip>

            <TreeViewDialogContent setOpen={setOpenSaveDialog} />
          </Dialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSyncCanvas}
                disabled={!hasUnsavedChanges || isUpdatingLobby}
                variant="ghost"
                size="lg"
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
                ? "Sync"
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
              Undo (Ctrl + Z)
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
              Redo (Ctrl + Shift + Z)
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
              Draw (Q)
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
              Eraser (W)
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="lg"
                onClick={handleScreenshot}
                disabled={!stageRef}
              >
                <Camera />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Screenshot
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
