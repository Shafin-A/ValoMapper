import { AnimatedContent } from "@/components/ui/animated-content";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanvas } from "@/contexts/canvas-context";
import { Tool } from "@/lib/types";
import { Vector2d } from "konva/lib/types";
import {
  Camera,
  Eraser,
  Loader2,
  MapPinned,
  Pencil,
  Redo,
  Save,
  Scan,
  Trash2,
  Undo,
  Info,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, type RefObject } from "react";
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
import { ImageUploadButton } from "./image-upload-button";
import { TextAddButton } from "./text-add-button";
import { MapStageHandle } from "@/components/canvas";

export interface ToolsSectionAction {
  icon: LucideIcon;
  label: string;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
  isPending?: boolean;
  tourId?: string;
}

interface ToolsSectionProps {
  mapPosition: Vector2d;
  stageRef?: RefObject<MapStageHandle | null>;
  saveAction?: ToolsSectionAction;
}

export const ToolsSection = ({
  mapPosition,
  stageRef,
  saveAction,
}: ToolsSectionProps) => {
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
    setEditingTextId,
    recenterCanvasCallback,
    onUndoRedoCallback,
  } = useCanvas();

  const { notifyImageAdded } = useCollaborativeCanvas();

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

  const handleRecenterCanvas = useRecenterCanvas(stageRef);

  const handleScreenshot = useScreenshot(stageRef);

  const { user } = useFirebaseAuth();

  const isAuthenticated = user !== null;
  const SaveActionIcon = saveAction?.isPending ? Loader2 : saveAction?.icon;

  useEffect(() => {
    recenterCanvasCallback.current = handleRecenterCanvas;
    return () => {
      recenterCanvasCallback.current = null;
    };
  }, [handleRecenterCanvas, recenterCanvasCallback]);

  return (
    <>
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
                  {saveAction
                    ? "Add text, images, and drawings here. You can also copy the current replay state into a fresh lobby, keep editing there, and save it once you are ready."
                    : "Add text, images, and drawings here. Also recenter the view, screenshot the canvas, save to folders, sync changes to the lobby, or undo/redo any action."}
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

          {saveAction ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={saveAction.label}
                  data-tour={saveAction.tourId}
                  variant="ghost"
                  size="lg"
                  onClick={saveAction.onClick}
                  disabled={saveAction.disabled || saveAction.isPending}
                >
                  {SaveActionIcon ? (
                    <SaveActionIcon
                      className={
                        saveAction.isPending ? "animate-spin" : undefined
                      }
                    />
                  ) : (
                    <Save />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                {saveAction.tooltip}
              </TooltipContent>
            </Tooltip>
          ) : (
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
          )}

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
              <TextAddButton
                mapPosition={mapPosition}
                onBeforeAdd={() => {
                  setVisionConesOpen(false);
                }}
                disabled={!stageRef}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Add Text
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ImageUploadButton
                mapPosition={mapPosition}
                onImageAdded={notifyImageAdded}
                disabled={!stageRef}
              />
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
