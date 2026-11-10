"use client";

import { useCanvas } from "@/contexts/canvas-context";
import {
  useHoveredElementId,
  useSetHoveredElementId,
} from "@/contexts/hover-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { useKeyboardShortcuts } from "@/hooks/canvas/use-keyboard-shortcuts";
import { usePathname } from "next/navigation";

export const KeyboardShortcuts = () => {
  const canvas = useCanvas();
  const collab = useCollaborativeCanvas();
  const pathname = usePathname();
  const isReplayRoute = Boolean(pathname?.startsWith("/replay"));
  const hoveredElementId = useHoveredElementId();
  const setHoveredElementId = useSetHoveredElementId();

  useKeyboardShortcuts({
    enabled: !isReplayRoute,
    undo: canvas.undo,
    redo: canvas.redo,
    tool: canvas.tool,
    setTool: canvas.setTool,
    isDrawMode: canvas.isDrawMode,
    setIsDrawMode: canvas.setIsDrawMode,
    editingTextId: canvas.editingTextId,
    setEditingTextId: canvas.setEditingTextId,
    setIsDeleteSettingsOpen: canvas.setIsDeleteSettingsOpen,
    phases: canvas.phases,
    currentPhaseIndex: canvas.currentPhaseIndex,
    switchToPhase: canvas.switchToPhase,
    notifyPhaseChanged: collab.notifyPhaseChanged,
    notifyAgentRemoved: collab.notifyAgentRemoved,
    notifyAbilityRemoved: collab.notifyAbilityRemoved,
    notifyConnLineRemoved: collab.notifyConnLineRemoved,
    notifyTextRemoved: collab.notifyTextRemoved,
    notifyImageRemoved: collab.notifyImageRemoved,
    notifyToolIconRemoved: collab.notifyToolIconRemoved,
    hoveredElementId,
    setHoveredElementId,
    setImagesOnCanvas: canvas.setImagesOnCanvas,
    setTextsOnCanvas: canvas.setTextsOnCanvas,
    setAgentsOnCanvas: canvas.setAgentsOnCanvas,
    setAbilitiesOnCanvas: canvas.setAbilitiesOnCanvas,
    setToolIconsOnCanvas: canvas.setToolIconsOnCanvas,
    connectingLines: canvas.connectingLines,
    setConnectingLines: canvas.setConnectingLines,
    recenterCanvasCallback: canvas.recenterCanvasCallback,
  });

  return null;
};
