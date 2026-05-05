"use client";

import { useSettings } from "@/contexts/settings-context";
import type {
  AbilityCanvas,
  AgentCanvas,
  ConnectingLine,
  ImageCanvas,
  PhaseState,
  TextCanvas,
  Tool,
  ToolIconCanvas,
} from "@/lib/types";
import { getAttachedVisionConeIds } from "@/lib/vision-cone-utils";
import { Dispatch, RefObject, SetStateAction, useEffect } from "react";
import { toast } from "sonner";

interface UseKeyboardShortcutsProps {
  undo: () => void;
  redo: () => void;
  onUndoRedo?: () => void;
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
  notifyPhaseChanged?: (phaseIndex: number) => void;
  notifyAgentRemoved?: (id: string) => void;
  notifyAbilityRemoved?: (id: string) => void;
  notifyConnLineRemoved?: (id: string) => void;
  notifyTextRemoved?: (id: string) => void;
  notifyImageRemoved?: (id: string) => void;
  notifyToolIconRemoved?: (id: string) => void;
  hoveredElementId: string | null;
  setHoveredElementId: Dispatch<SetStateAction<string | null>>;
  setImagesOnCanvas: Dispatch<SetStateAction<ImageCanvas[]>>;
  setTextsOnCanvas: Dispatch<SetStateAction<TextCanvas[]>>;
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>;
  connectingLines: ConnectingLine[];
  setConnectingLines: Dispatch<SetStateAction<ConnectingLine[]>>;
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
  onUndoRedo,
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
  notifyPhaseChanged,
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
  notifyAgentRemoved,
  notifyAbilityRemoved,
  notifyConnLineRemoved,
  notifyTextRemoved,
  notifyImageRemoved,
  notifyToolIconRemoved,
}: UseKeyboardShortcutsProps): void => {
  const {
    drawSettings,
    eraserSettings,
    updateDrawSettings,
    updateEraserSettings,
  } = useSettings();

  const currentPhase = phases[currentPhaseIndex];
  const agentsOnCanvas = currentPhase?.agentsOnCanvas ?? [];
  const abilitiesOnCanvas = currentPhase?.abilitiesOnCanvas ?? [];
  const imagesOnCanvas = currentPhase?.imagesOnCanvas ?? [];
  const textsOnCanvas = currentPhase?.textsOnCanvas ?? [];
  const toolIconsOnCanvas = currentPhase?.toolIconsOnCanvas ?? [];

  useEffect(() => {
    const handleModifierShortcuts = (
      key: string,
      e: KeyboardEvent,
      shiftKey: boolean,
    ): boolean => {
      if (key === "z") {
        if (shiftKey) {
          redo();
        } else {
          undo();
        }
        setTimeout(() => onUndoRedo?.(), 50);
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
        const newIndex = currentPhaseIndex - 1;
        switchToPhase(newIndex);
        notifyPhaseChanged?.(newIndex);
        e.preventDefault();
        return true;
      }

      if (key === "d" && currentPhaseIndex < phases.length - 1) {
        const newIndex = currentPhaseIndex + 1;
        switchToPhase(newIndex);
        notifyPhaseChanged?.(newIndex);
        e.preventDefault();
        return true;
      }

      return false;
    };

    const handleDeleteHoveredElement = (
      key: string,
      e: KeyboardEvent,
    ): boolean => {
      if (key !== "e") return false;
      if (!hoveredElementId || isDrawMode || editingTextId) return false;

      const connectedLine = connectingLines.find(
        (line) =>
          line.fromId === hoveredElementId || line.toId === hoveredElementId,
      );

      if (imagesOnCanvas.some((image) => image.id === hoveredElementId)) {
        setImagesOnCanvas((prev) =>
          prev.filter((image) => image.id !== hoveredElementId),
        );
        notifyImageRemoved?.(hoveredElementId);
      }

      if (textsOnCanvas.some((text) => text.id === hoveredElementId)) {
        setTextsOnCanvas((prev) =>
          prev.filter((text) => text.id !== hoveredElementId),
        );
        notifyTextRemoved?.(hoveredElementId);
      }

      if (agentsOnCanvas.some((agent) => agent.id === hoveredElementId)) {
        const removedAbilityIds = new Set(
          getAttachedVisionConeIds(abilitiesOnCanvas, hoveredElementId),
        );

        if (connectedLine) {
          const connectedAbilityId =
            connectedLine.fromId === hoveredElementId
              ? connectedLine.toId
              : connectedLine.toId === hoveredElementId
                ? connectedLine.fromId
                : null;

          if (connectedAbilityId) {
            removedAbilityIds.add(connectedAbilityId);
            getAttachedVisionConeIds(
              abilitiesOnCanvas,
              connectedAbilityId,
            ).forEach((removedId) => removedAbilityIds.add(removedId));
            setConnectingLines((lines) =>
              lines.filter((line) => line.id !== connectedLine.id),
            );
            notifyConnLineRemoved?.(connectedLine.id);
          }
        }

        if (removedAbilityIds.size > 0) {
          setAbilitiesOnCanvas((prev) =>
            prev.filter((ability) => !removedAbilityIds.has(ability.id)),
          );
          removedAbilityIds.forEach((removedId) =>
            notifyAbilityRemoved?.(removedId),
          );
        }

        setAgentsOnCanvas((prev) =>
          prev.filter((agent) => agent.id !== hoveredElementId),
        );
        notifyAgentRemoved?.(hoveredElementId);
      }

      if (
        abilitiesOnCanvas.some((ability) => ability.id === hoveredElementId)
      ) {
        const removedAbilityIds = new Set([
          hoveredElementId,
          ...getAttachedVisionConeIds(abilitiesOnCanvas, hoveredElementId),
        ]);

        if (connectedLine) {
          const connectedAgentId =
            connectedLine.fromId === hoveredElementId
              ? connectedLine.toId
              : connectedLine.toId === hoveredElementId
                ? connectedLine.fromId
                : null;

          if (connectedAgentId) {
            setAgentsOnCanvas((agents) =>
              agents.filter((agent) => agent.id !== connectedAgentId),
            );
            notifyAgentRemoved?.(connectedAgentId);
            setConnectingLines((lines) =>
              lines.filter((line) => line.id !== connectedLine.id),
            );
            notifyConnLineRemoved?.(connectedLine.id);
          }
        }

        setAbilitiesOnCanvas((prev) =>
          prev.filter((ability) => !removedAbilityIds.has(ability.id)),
        );
        removedAbilityIds.forEach((removedId) =>
          notifyAbilityRemoved?.(removedId),
        );
      }

      if (
        toolIconsOnCanvas.some((toolIcon) => toolIcon.id === hoveredElementId)
      ) {
        const removedAbilityIds = getAttachedVisionConeIds(
          abilitiesOnCanvas,
          hoveredElementId,
        );

        if (removedAbilityIds.length > 0) {
          const removedIdSet = new Set(removedAbilityIds);
          setAbilitiesOnCanvas((prev) =>
            prev.filter((ability) => !removedIdSet.has(ability.id)),
          );
          removedAbilityIds.forEach((removedId) =>
            notifyAbilityRemoved?.(removedId),
          );
        }

        setToolIconsOnCanvas((prev) =>
          prev.filter((toolIcon) => toolIcon.id !== hoveredElementId),
        );
        notifyToolIconRemoved?.(hoveredElementId);
      }

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
      shiftKey: boolean,
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
    onUndoRedo,
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
    notifyPhaseChanged,
    agentsOnCanvas,
    abilitiesOnCanvas,
    hoveredElementId,
    imagesOnCanvas,
    setHoveredElementId,
    setImagesOnCanvas,
    setTextsOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setToolIconsOnCanvas,
    connectingLines,
    textsOnCanvas,
    toolIconsOnCanvas,
    setConnectingLines,
    recenterCanvasCallback,
    notifyImageRemoved,
    notifyTextRemoved,
    notifyConnLineRemoved,
    notifyAbilityRemoved,
    notifyAgentRemoved,
    notifyToolIconRemoved,
  ]);
};
