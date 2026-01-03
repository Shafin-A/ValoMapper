"use client";

import { useSettings } from "@/contexts/settings-context";
import type {
  AbilityCanvas,
  AgentCanvas,
  ImageCanvas,
  PhaseState,
  TextCanvas,
  Tool,
  ToolIconCanvas,
} from "@/lib/types";
import { Dispatch, RefObject, SetStateAction, useEffect } from "react";
import { toast } from "sonner";

interface UseKeyboardShortcutsProps {
  undo: () => void;
  redo: () => void;
  tool: Tool;
  setTool: Dispatch<SetStateAction<Tool>>;
  isDrawMode: boolean;
  setIsDrawMode: Dispatch<SetStateAction<boolean>>;
  editingTextId: string | null;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
  setIsDeleteSettingsOpen: Dispatch<SetStateAction<boolean>>;
  phases: PhaseState[];
  currentPhaseIndex: number;
  switchToPhase: (index: number) => void;
  hoveredElementId: string | null;
  setHoveredElementId: Dispatch<SetStateAction<string | null>>;
  setImagesOnCanvas: Dispatch<SetStateAction<ImageCanvas[]>>;
  setTextsOnCanvas: Dispatch<SetStateAction<TextCanvas[]>>;
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>;
  recenterCanvasCallback: RefObject<(() => void) | null>;
}

const isInputElement = (target: HTMLElement | null): boolean => {
  if (!target) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
};

export const useKeyboardShortcuts = ({
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
  hoveredElementId,
  setHoveredElementId,
  setImagesOnCanvas,
  setTextsOnCanvas,
  setAgentsOnCanvas,
  setAbilitiesOnCanvas,
  setToolIconsOnCanvas,
  recenterCanvasCallback,
}: UseKeyboardShortcutsProps): void => {
  const {
    drawSettings,
    eraserSettings,
    updateDrawSettings,
    updateEraserSettings,
  } = useSettings();

  useEffect(() => {
    const handleModifierShortcuts = (
      key: string,
      e: KeyboardEvent,
      shiftKey: boolean
    ): boolean => {
      if (key === "z") {
        if (shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
        return true;
      }

      if (key === "q") {
        if (shiftKey) {
          updateDrawSettings({ isArrowHead: !drawSettings.isArrowHead });
        } else {
          updateDrawSettings({ isDashed: !drawSettings.isDashed });
        }
        e.preventDefault();
        return true;
      }

      return false;
    };

    const handlePhaseNavigation = (key: string, e: KeyboardEvent): boolean => {
      if (key === "a" && currentPhaseIndex > 0) {
        switchToPhase(currentPhaseIndex - 1);
        e.preventDefault();
        return true;
      }

      if (key === "d" && currentPhaseIndex < phases.length - 1) {
        switchToPhase(currentPhaseIndex + 1);
        e.preventDefault();
        return true;
      }

      return false;
    };

    const handleDeleteHoveredElement = (
      key: string,
      e: KeyboardEvent
    ): boolean => {
      if (key !== "e") return false;
      if (!hoveredElementId || isDrawMode || editingTextId) return false;

      setImagesOnCanvas((prev) =>
        prev.filter((img) => img.id !== hoveredElementId)
      );
      setTextsOnCanvas((prev) =>
        prev.filter((txt) => txt.id !== hoveredElementId)
      );
      setAgentsOnCanvas((prev) =>
        prev.filter((agent) => agent.id !== hoveredElementId)
      );
      setAbilitiesOnCanvas((prev) =>
        prev.filter((ability) => ability.id !== hoveredElementId)
      );
      setToolIconsOnCanvas((prev) =>
        prev.filter((toolIcon) => toolIcon.id !== hoveredElementId)
      );
      setHoveredElementId(null);
      e.preventDefault();
      return true;
    };

    const handleRecenter = (key: string, e: KeyboardEvent): boolean => {
      if (key !== "r") return false;

      recenterCanvasCallback.current?.();
      e.preventDefault();
      return true;
    };

    const handleDrawToolToggle = (key: string, e: KeyboardEvent): boolean => {
      if (key === "q") {
        if (tool === "pencil" && isDrawMode) {
          setIsDrawMode(false);
        } else {
          setIsDeleteSettingsOpen(false);
          setEditingTextId(null);
          setIsDrawMode(true);
          setTool("pencil");
        }
        e.preventDefault();
        return true;
      }

      if (key === "w") {
        if (tool === "eraser" && isDrawMode) {
          setIsDrawMode(false);
        } else {
          setIsDeleteSettingsOpen(false);
          setEditingTextId(null);
          setIsDrawMode(true);
          setTool("eraser");
        }
        e.preventDefault();
        return true;
      }

      return false;
    };

    const handleEraserModeToggle = (
      key: string,
      e: KeyboardEvent,
      shiftKey: boolean
    ): boolean => {
      if (key === "w" && shiftKey) {
        updateEraserSettings({
          mode: eraserSettings.mode === "line" ? "pixel" : "line",
        });
        e.preventDefault();
        return true;
      }
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      try {
        if (isInputElement(e.target as HTMLElement)) return;

        const key = e.key.toLowerCase();
        const isModifier = e.ctrlKey || e.metaKey;

        // Handle modifier key shortcuts (Ctrl/Cmd + key)
        if (isModifier) {
          if (handleModifierShortcuts(key, e, e.shiftKey)) return;
        }

        // Handle Shift+W for eraser mode toggle
        if (handleEraserModeToggle(key, e, e.shiftKey)) return;

        // Handle phase navigation (A/D keys)
        if (handlePhaseNavigation(key, e)) return;

        // Handle delete hovered element (E key)
        if (handleDeleteHoveredElement(key, e)) return;

        // Handle recenter canvas (R key)
        if (handleRecenter(key, e)) return;

        // Handle draw tool toggles (Q/W keys without modifiers)
        if (handleDrawToolToggle(key, e)) return;
      } catch (err) {
        console.error("Keyboard shortcut error:", err);
        toast.error("An unexpected error occurred with keyboard shortcuts");
      }
    };

    const listenerOptions: AddEventListenerOptions = { capture: true };
    window.addEventListener("keydown", onKeyDown, listenerOptions);
    return () =>
      window.removeEventListener("keydown", onKeyDown, listenerOptions);
  }, [
    undo,
    redo,
    setIsDrawMode,
    tool,
    setTool,
    setIsDeleteSettingsOpen,
    setEditingTextId,
    isDrawMode,
    editingTextId,
    drawSettings,
    eraserSettings,
    updateDrawSettings,
    updateEraserSettings,
    phases,
    currentPhaseIndex,
    switchToPhase,
    hoveredElementId,
    setHoveredElementId,
    setImagesOnCanvas,
    setTextsOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setToolIconsOnCanvas,
    recenterCanvasCallback,
  ]);
};
