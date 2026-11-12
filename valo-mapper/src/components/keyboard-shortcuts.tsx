"use client";

import {
  useCanvasActions,
  useCanvasConnectingLines,
  useCanvasEntityActions,
  useCanvasHistory,
  useCanvasPhase,
  useCanvasUi,
} from "@/contexts/canvas-context";
import {
  useHoveredElementId,
  useSetHoveredElementId,
} from "@/contexts/hover-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { useKeyboardShortcuts } from "@/hooks/canvas/use-keyboard-shortcuts";
import { usePathname } from "next/navigation";

export const KeyboardShortcuts = () => {
  const { undo, redo } = useCanvasHistory();
  const {
    tool,
    setTool,
    isDrawMode,
    setIsDrawMode,
    editingTextId,
    setEditingTextId,
    setIsDeleteSettingsOpen,
  } = useCanvasUi();
  const { phases, currentPhaseIndex, switchToPhase } = useCanvasPhase();
  const {
    setImagesOnCanvas,
    setTextsOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setToolIconsOnCanvas,
    setConnectingLines,
  } = useCanvasEntityActions();
  const { connectingLines } = useCanvasConnectingLines();
  const { recenterCanvasCallback } = useCanvasActions();
  const collab = useCollaborativeCanvas();
  const pathname = usePathname();
  const isReplayRoute = Boolean(pathname?.startsWith("/replay"));
  const hoveredElementId = useHoveredElementId();
  const setHoveredElementId = useSetHoveredElementId();

  useKeyboardShortcuts({
    enabled: !isReplayRoute,
    undo,
    redo,
    tool,
    setTool,
    isDrawMode,
    setIsDrawMode,
    editingTextId,
    setEditingTextId,
    setIsDeleteSettingsOpen,
    phases,
    currentPhaseIndex,
    switchToPhase,
    notifyPhaseChanged: collab.notifyPhaseChanged,
    notifyAgentRemoved: collab.notifyAgentRemoved,
    notifyAbilityRemoved: collab.notifyAbilityRemoved,
    notifyConnLineRemoved: collab.notifyConnLineRemoved,
    notifyTextRemoved: collab.notifyTextRemoved,
    notifyImageRemoved: collab.notifyImageRemoved,
    notifyToolIconRemoved: collab.notifyToolIconRemoved,
    hoveredElementId,
    setHoveredElementId,
    setImagesOnCanvas,
    setTextsOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setToolIconsOnCanvas,
    connectingLines,
    setConnectingLines,
    recenterCanvasCallback,
  });

  return null;
};
