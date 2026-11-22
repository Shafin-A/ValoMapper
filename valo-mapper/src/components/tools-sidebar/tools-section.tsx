import { AnimatedContent } from "@/components/ui/animated-content";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useCanvasActions,
  useCanvasHistory,
  useCanvasUi,
} from "@/contexts/canvas-context";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { InfoHint } from "@/components/shared/info-hint";
import { useTranslations } from "next-intl";

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
  onTextAdded?: () => void;
}

export const ToolsSection = ({
  mapPosition,
  stageRef,
  saveAction,
  onTextAdded,
}: ToolsSectionProps) => {
  const t = useTranslations("tools");
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openLineupDialog, setOpenLineupDialog] = useState(false);
  const [visionConesOpen, setVisionConesOpen] = useState(false);
  const isMobile = useIsMobile();

  const { undo, redo, canUndo, canRedo } = useCanvasHistory();
  const {
    setIsDrawMode,
    tool,
    setTool,
    isDrawMode,
    isDeleteSettingsOpen,
    setIsDeleteSettingsOpen,
    setEditingTextId,
  } = useCanvasUi();
  const { recenterCanvasCallback } = useCanvasActions();

  const { notifyImageAdded } = useCollaborativeCanvas();

  const handleUndo = () => {
    undo();
  };

  const handleRedo = () => {
    redo();
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
          <span className="text-base font-semibold">{t("toolsSection")}</span>
          <InfoHint label={t("aboutTools")}>
            <div className="max-w-xs">
              {isMobile ? (
                <div className="space-y-1">
                  <p>{t("mobileHelpDraw")}</p>
                  <p>{t("mobileHelpUndo")}</p>
                  <p>{t("mobileHelpDelete")}</p>
                  <p>{t("mobileHelpPan")}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p>{t("desktopHelpDraw")}</p>
                  <p>{t("desktopHelpErase")}</p>
                  <p>{t("desktopHelpDelete")}</p>
                  <p>{t("desktopHelpRecenter")}</p>
                  <p>{t("desktopHelpHistory")}</p>
                </div>
              )}
              <div className="mt-2">
                <p>{saveAction ? t("generalHelpReplay") : t("generalHelp")}</p>
              </div>
            </div>
          </InfoHint>
        </div>
        <div className="grid grid-cols-5 gap-2 [&>button]:h-11 sm:[&>button]:h-10">
          <div className="invisible" aria-hidden="true" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="lg"
                aria-label={t("recenterCanvas")}
                onClick={handleRecenterCanvas}
                disabled={!stageRef}
              >
                <Scan />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              {t("recenterCanvasShortcut")}
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
                      aria-label={
                        !isAuthenticated ? t("logInToSave") : t("save")
                      }
                      disabled={!isAuthenticated}
                    >
                      <Save />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  {!isAuthenticated ? t("logInToSave") : t("save")}
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
                aria-label={t("undo")}
              >
                <Undo />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              {t("undoShortcut")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleRedo}
                disabled={!canRedo}
                variant="ghost"
                size="lg"
                aria-label={t("redo")}
              >
                <Redo />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              {t("redoShortcut")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="lg"
                aria-label={t("draw")}
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
              {t("drawShortcut")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="lg"
                aria-label={t("eraser")}
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
              {t("eraserShortcut")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="lg"
                variant="destructive"
                aria-label={t("deleteOptions")}
                data-state={isDeleteSettingsOpen ? "on" : "off"}
                pressed={isDeleteSettingsOpen}
                onPressedChange={handleDeletePressedChange}
              >
                <Trash2 />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              {t("delete")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <TextAddButton
                mapPosition={mapPosition}
                aria-label={t("addText")}
                onBeforeAdd={() => {
                  setVisionConesOpen(false);
                }}
                onTextAdded={onTextAdded}
                disabled={!stageRef}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              {t("addText")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <ImageUploadButton
                mapPosition={mapPosition}
                aria-label={t("addImage")}
                onImageAdded={notifyImageAdded}
                disabled={!stageRef}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              {t("addImage")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="lg"
                aria-label={t("visionCones")}
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
              {t("visionCones")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="lg"
                aria-label={t("screenshot")}
                onClick={handleScreenshot}
                disabled={!stageRef}
              >
                <Camera />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              {t("screenshot")}
            </TooltipContent>
          </Tooltip>

          <Dialog open={openLineupDialog} onOpenChange={setOpenLineupDialog}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="lg"
                    aria-label={t("addLineup")}
                  >
                    <MapPinned />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                {t("addLineup")}
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
