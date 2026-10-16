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
import { Dispatch, RefObject, SetStateAction, useEffect, useRef } from "react";
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

type SettingsSlice = Pick<
  ReturnType<typeof useSettings>,
  | "drawSettings"
  | "eraserSettings"
  | "updateDrawSettings"
  | "updateEraserSettings"
>;

type ShortcutContext = UseKeyboardShortcutsProps & SettingsSlice;

const isInputElement = (target: HTMLElement | null): boolean => {
  if (!target) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
};

const getOtherEnd = (line: ConnectingLine, id: string): string =>
  line.fromId === id ? line.toId : line.fromId;

const removeAbilities = (ctx: ShortcutContext, ids: Iterable<string>): void => {
  const idSet = new Set(ids);
  if (idSet.size === 0) return;

  ctx.setAbilitiesOnCanvas((prev) =>
    prev.filter((ability) => !idSet.has(ability.id)),
  );
  idSet.forEach((id) => ctx.notifyAbilityRemoved?.(id));
};

const removeAgent = (ctx: ShortcutContext, id: string): void => {
  ctx.setAgentsOnCanvas((prev) => prev.filter((agent) => agent.id !== id));
  ctx.notifyAgentRemoved?.(id);
};

const removeConnectingLine = (
  ctx: ShortcutContext,
  line: ConnectingLine,
): void => {
  ctx.setConnectingLines((lines) => lines.filter((l) => l.id !== line.id));
  ctx.notifyConnLineRemoved?.(line.id);
};

const handleModifierShortcuts = (
  ctx: ShortcutContext,
  key: string,
  e: KeyboardEvent,
): boolean => {
  if (key === "z") {
    if (e.shiftKey) ctx.redo();
    else ctx.undo();
    e.preventDefault();
    return true;
  }

  if (key === "q") {
    if (e.shiftKey) {
      ctx.updateDrawSettings({
        isArrowHead: !ctx.drawSettings.isArrowHead,
      });
    } else {
      ctx.updateDrawSettings({ isDashed: !ctx.drawSettings.isDashed });
    }
    e.preventDefault();
    return true;
  }

  return false;
};

const handleEraserModeToggle = (
  ctx: ShortcutContext,
  key: string,
  e: KeyboardEvent,
): boolean => {
  if (key !== "w" || !e.shiftKey) return false;

  ctx.updateEraserSettings({
    mode: ctx.eraserSettings.mode === "line" ? "pixel" : "line",
  });
  e.preventDefault();
  return true;
};

const handlePhaseNavigation = (
  ctx: ShortcutContext,
  key: string,
  e: KeyboardEvent,
): boolean => {
  const { currentPhaseIndex, phases } = ctx;

  let newIndex: number | null = null;
  if (key === "a" && currentPhaseIndex > 0) {
    newIndex = currentPhaseIndex - 1;
  } else if (key === "d" && currentPhaseIndex < phases.length - 1) {
    newIndex = currentPhaseIndex + 1;
  }

  if (newIndex === null) return false;

  ctx.switchToPhase(newIndex);
  ctx.notifyPhaseChanged?.(newIndex);
  e.preventDefault();
  return true;
};

const handleDeleteHoveredElement = (
  ctx: ShortcutContext,
  key: string,
  e: KeyboardEvent,
): boolean => {
  if (key !== "e") return false;

  const { hoveredElementId, isDrawMode, editingTextId } = ctx;
  if (!hoveredElementId || isDrawMode || editingTextId) return false;

  const currentPhase = ctx.phases[ctx.currentPhaseIndex];
  const agents = currentPhase?.agentsOnCanvas ?? [];
  const abilities = currentPhase?.abilitiesOnCanvas ?? [];
  const images = currentPhase?.imagesOnCanvas ?? [];
  const texts = currentPhase?.textsOnCanvas ?? [];
  const toolIcons = currentPhase?.toolIconsOnCanvas ?? [];

  const id = hoveredElementId;
  const connectedLine = ctx.connectingLines.find(
    (line) => line.fromId === id || line.toId === id,
  );

  if (images.some((image) => image.id === id)) {
    ctx.setImagesOnCanvas((prev) => prev.filter((image) => image.id !== id));
    ctx.notifyImageRemoved?.(id);
  } else if (texts.some((text) => text.id === id)) {
    ctx.setTextsOnCanvas((prev) => prev.filter((text) => text.id !== id));
    ctx.notifyTextRemoved?.(id);
  } else if (agents.some((agent) => agent.id === id)) {
    const removedAbilityIds = new Set(getAttachedVisionConeIds(abilities, id));

    if (connectedLine) {
      const connectedAbilityId = getOtherEnd(connectedLine, id);
      removedAbilityIds.add(connectedAbilityId);
      getAttachedVisionConeIds(abilities, connectedAbilityId).forEach(
        (coneId) => removedAbilityIds.add(coneId),
      );
      removeConnectingLine(ctx, connectedLine);
    }

    removeAbilities(ctx, removedAbilityIds);
    removeAgent(ctx, id);
  } else if (abilities.some((ability) => ability.id === id)) {
    const removedAbilityIds = new Set([
      id,
      ...getAttachedVisionConeIds(abilities, id),
    ]);

    if (connectedLine) {
      removeAgent(ctx, getOtherEnd(connectedLine, id));
      removeConnectingLine(ctx, connectedLine);
    }

    removeAbilities(ctx, removedAbilityIds);
  } else if (toolIcons.some((toolIcon) => toolIcon.id === id)) {
    removeAbilities(ctx, getAttachedVisionConeIds(abilities, id));
    ctx.setToolIconsOnCanvas((prev) =>
      prev.filter((toolIcon) => toolIcon.id !== id),
    );
    ctx.notifyToolIconRemoved?.(id);
  }

  ctx.setHoveredElementId(null);
  e.preventDefault();
  return true;
};

const handleRecenter = (
  ctx: ShortcutContext,
  key: string,
  e: KeyboardEvent,
): boolean => {
  if (key !== "r") return false;

  ctx.recenterCanvasCallback.current?.();
  e.preventDefault();
  return true;
};

const handleDrawToolToggle = (
  ctx: ShortcutContext,
  key: string,
  e: KeyboardEvent,
): boolean => {
  let target: Tool;
  if (key === "q") target = "pencil";
  else if (key === "w") target = "eraser";
  else return false;

  if (ctx.tool === target && ctx.isDrawMode) {
    ctx.setIsDrawMode(false);
  } else {
    ctx.setIsDeleteSettingsOpen(false);
    ctx.setEditingTextId(null);
    ctx.setIsDrawMode(true);
    ctx.setTool(target);
  }
  e.preventDefault();
  return true;
};

export const useKeyboardShortcuts = (
  props: UseKeyboardShortcutsProps,
): void => {
  const {
    drawSettings,
    eraserSettings,
    updateDrawSettings,
    updateEraserSettings,
  } = useSettings();

  const contextRef = useRef<ShortcutContext>({
    ...props,
    drawSettings,
    eraserSettings,
    updateDrawSettings,
    updateEraserSettings,
  });

  useEffect(() => {
    contextRef.current = {
      ...props,
      drawSettings,
      eraserSettings,
      updateDrawSettings,
      updateEraserSettings,
    };
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      try {
        if (isInputElement(e.target as HTMLElement)) return;

        const ctx = contextRef.current;
        const key = e.key.toLowerCase();
        const isModifier = e.ctrlKey || e.metaKey;

        // Ctrl/Cmd + key
        if (isModifier && handleModifierShortcuts(ctx, key, e)) return;

        // Shift + W: toggle eraser mode
        if (handleEraserModeToggle(ctx, key, e)) return;

        // A / D: previous / next phase
        if (handlePhaseNavigation(ctx, key, e)) return;

        // E: delete hovered element
        if (handleDeleteHoveredElement(ctx, key, e)) return;

        // R: recenter canvas
        if (handleRecenter(ctx, key, e)) return;

        // Q / W: toggle pencil / eraser
        if (handleDrawToolToggle(ctx, key, e)) return;
      } catch (err) {
        console.error("Keyboard shortcut error:", err);
        toast.error("An unexpected error occurred with keyboard shortcuts");
      }
    };

    const listenerOptions: AddEventListenerOptions = { capture: true };
    window.addEventListener("keydown", onKeyDown, listenerOptions);
    return () =>
      window.removeEventListener("keydown", onKeyDown, listenerOptions);
  }, []);
};
