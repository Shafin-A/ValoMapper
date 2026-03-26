import { AnimatedContent } from "@/components/ui/animated-content";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanvas } from "@/contexts/canvas-context";
import {
  ALLOWED_IMAGE_UPLOAD_MIME_TYPES,
  IMAGE_UPLOAD_ACCEPT_ATTR,
  MAP_SIZE,
} from "@/lib/consts";
import { Tool } from "@/lib/types";
import { getNextId } from "@/lib/utils";
import { Vector2d } from "konva/lib/types";
import {
  ALargeSmall,
  Camera,
  Eraser,
  Image as ImageIcon,
  MapPinned,
  Pencil,
  Redo,
  Save,
  Scan,
  Trash2,
  Undo,
  Info,
  Eye,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { DeleteSettings } from "./delete-settings";
import { DrawSettings } from "./draw-settings";
import { EraserSettings } from "./eraser-settings";
import { VisionConeSettings } from "./vision-cone-settings";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import TreeViewDialogContent from "../strategies/tree-view-dialog-content";
import { LineupDialog } from "./lineup-dialog";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { useScreenshot } from "@/hooks/use-screenshot";
import { useRecenterCanvas } from "@/hooks/use-recenter-canvas";
import { MapStageHandle } from "@/components/canvas";
import { RefObject } from "react";

interface ToolsSectionProps {
  mapPosition: Vector2d;
  stageRef?: RefObject<MapStageHandle | null>;
}

export const ToolsSection = ({ mapPosition, stageRef }: ToolsSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openLineupDialog, setOpenLineupDialog] = useState(false);
  const [visionConesOpen, setVisionConesOpen] = useState(false);

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
    recenterCanvasCallback,
    onUndoRedoCallback,
  } = useCanvas();

  const { notifyTextAdded, notifyImageAdded } = useCollaborativeCanvas();

  const handleUndo = () => {
    undo();
    setTimeout(() => onUndoRedoCallback.current?.(), 50);
  };

  const handleRedo = () => {
    redo();
    setTimeout(() => onUndoRedoCallback.current?.(), 50);
  };

  const handleDrawPressedChange = (pressed: boolean, tool: Tool) => {
    setIsDeleteSettingsOpen(false);
    setVisionConesOpen(false);
    setIsDrawMode(pressed);
    if (pressed) {
      setTool(tool);
      setEditingTextId(null);
    }
  };

  const handleDeletePressedChange = (pressed: boolean) => {
    setIsDrawMode(false);
    setVisionConesOpen(false);
    setIsDeleteSettingsOpen(pressed);
  };

  const handleLineupConfirm = () => {
    setOpenLineupDialog(false);
  };

  const handleLineupCancel = () => {
    setOpenLineupDialog(false);
  };

  const handleAddText = () => {
    setEditingTextId(null);
    setIsDrawMode(false);
    setVisionConesOpen(false);

    const newText = {
      id: getNextId("text"),
      text: "",
      x: mapPosition.x + MAP_SIZE / 2 + Math.round(Math.random() * 20),
      y: mapPosition.y + MAP_SIZE / 2 + Math.round(Math.random() * 20),
      width: 200,
      height: 60,
    };

    setTextsOnCanvas((prev) => [...prev, newText]);
    notifyTextAdded(newText);
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRecenterCanvas = useRecenterCanvas(stageRef);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileType = file.type.toLowerCase();
    if (
      !ALLOWED_IMAGE_UPLOAD_MIME_TYPES.includes(
        fileType as (typeof ALLOWED_IMAGE_UPLOAD_MIME_TYPES)[number],
      )
    ) {
      toast.error("Unsupported image type. Use JPEG, PNG, GIF, or WEBP.");
      event.target.value = "";
      return;
    }

    let url: string;
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error ?? "Upload failed");
      }
      const data = await response.json();
      url = data.url as string;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload image",
      );
      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      const maxSize = 500;
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width >= height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > width && height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }

      const newImage = {
        id: getNextId("image"),
        src: url,
        x: mapPosition.x + MAP_SIZE / 2 + Math.round(Math.random() * 20),
        y: mapPosition.y + MAP_SIZE / 2 + Math.round(Math.random() * 20),
        width,
        height,
      };

      setImagesOnCanvas((prev) => [...prev, newImage]);
      notifyImageAdded(newImage);
    };
    img.src = objectUrl;

    event.target.value = "";
  };

  const handleScreenshot = useScreenshot(stageRef);

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
        accept={IMAGE_UPLOAD_ACCEPT_ATTR}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <div className="space-y-2 mt-4" data-tour="tools-section">
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
          <div className="invisible" aria-hidden="true" />
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
                    data-tour="save-strategy"
                    variant="ghost"
                    size="lg"
                    disabled={!isAuthenticated}
                  >
                    <Save />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                {!isAuthenticated ? "Log in to save" : "Save"}
              </TooltipContent>
            </Tooltip>

            <TreeViewDialogContent setOpen={setOpenSaveDialog} />
          </Dialog>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleUndo}
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
                onClick={handleRedo}
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
              <Toggle
                size="lg"
                data-state={visionConesOpen ? "on" : "off"}
                pressed={visionConesOpen}
                onPressedChange={(pressed) => {
                  setIsDrawMode(false);
                  setIsDeleteSettingsOpen(false);
                  setVisionConesOpen(pressed);
                }}
              >
                <Eye />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Vision Cones
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

          <Dialog open={openLineupDialog} onOpenChange={setOpenLineupDialog}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="lg">
                    <MapPinned />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                Add Lineup
              </TooltipContent>
            </Tooltip>
            <LineupDialog
              onConfirm={handleLineupConfirm}
              onCancel={handleLineupCancel}
              mapPosition={mapPosition}
            />
          </Dialog>
        </div>

        <AnimatedContent show={visionConesOpen}>
          <VisionConeSettings mapPosition={mapPosition} />
        </AnimatedContent>

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
