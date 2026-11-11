"use client";

import { useState } from "react";
import {
  Eraser,
  Pencil,
  Redo,
  Scan,
  SidebarIcon,
  Trash2,
  Undo,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import { DeleteSettings } from "@/components/tools-sidebar/delete-settings";
import { useCanvas } from "@/contexts/canvas-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRecenterCanvas } from "@/hooks/use-recenter-canvas";
import type { MapStageHandle } from "@/components/canvas";

interface MobileCanvasToolbarProps {
  stageRef: React.RefObject<MapStageHandle | null>;
  onOpenTools: () => void;
  onOpenAgents: () => void;
}

/**
 * Persistent mobile-only toolbar for the actions used most while editing.
 */
export const MobileCanvasToolbar = ({
  stageRef,
  onOpenTools,
  onOpenAgents,
}: MobileCanvasToolbarProps) => {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    isDrawMode,
    setIsDrawMode,
    tool,
    setTool,
    setEditingTextId,
    setIsDeleteSettingsOpen,
  } = useCanvas();
  const isMobile = useIsMobile();
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const handleRecenterCanvas = useRecenterCanvas(stageRef);

  const setDrawMode = (pressed: boolean) => {
    setIsDeleteSettingsOpen(false);
    setIsDrawMode(pressed);
    if (pressed) {
      setTool("pencil");
      setEditingTextId(null);
    }
  };

  const setEraseMode = (pressed: boolean) => {
    setIsDeleteSettingsOpen(false);
    setIsDrawMode(pressed);
    if (pressed) {
      setTool("eraser");
      setEditingTextId(null);
    }
  };

  const openDeleteSheet = () => {
    setIsDrawMode(false);
    setEditingTextId(null);
    setDeleteSheetOpen(true);
  };

  if (!isMobile) {
    return null;
  }

  return (
    <>
      <div className="flex shrink-0 items-center justify-around gap-1 border-t bg-background/95 px-1 py-1 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 min-w-0 flex-1"
          aria-label="Open tools"
          onClick={onOpenTools}
        >
          <SidebarIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 min-w-0 flex-1"
          aria-label="Undo"
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 min-w-0 flex-1"
          aria-label="Redo"
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo />
        </Button>
        <Toggle
          size="lg"
          className="h-11 min-w-0 flex-1"
          aria-label="Draw"
          pressed={isDrawMode && tool === "pencil"}
          onPressedChange={setDrawMode}
        >
          <Pencil />
        </Toggle>
        <Toggle
          size="lg"
          className="h-11 min-w-0 flex-1"
          aria-label="Erase"
          pressed={isDrawMode && tool === "eraser"}
          onPressedChange={setEraseMode}
        >
          <Eraser />
        </Toggle>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 min-w-0 flex-1"
          aria-label="Delete options"
          onClick={openDeleteSheet}
        >
          <Trash2 />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 min-w-0 flex-1"
          aria-label="Recenter canvas"
          disabled={!stageRef}
          onClick={handleRecenterCanvas}
        >
          <Scan />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 min-w-0 flex-1"
          aria-label="Open agents"
          onClick={onOpenAgents}
        >
          <SidebarIcon className="rotate-180" />
        </Button>
      </div>

      <Sheet open={deleteSheetOpen} onOpenChange={setDeleteSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[80dvh] gap-0 rounded-t-xl pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="border-b px-4 pb-3 text-left">
            <SheetTitle>Delete</SheetTitle>
            <SheetDescription>
              Remove elements from the current phase or the whole strategy.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <DeleteSettings />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
