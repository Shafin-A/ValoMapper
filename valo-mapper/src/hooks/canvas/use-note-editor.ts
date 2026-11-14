"use client";

import { useCanvasEntities } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import type { CanvasSelectionItem } from "@/lib/types";
import { useCallback } from "react";

/** Notes live on the item, so normal entity setters/notifiers handle history and sync. */
export const useNoteEditor = () => {
  const {
    agentsOnCanvas,
    abilitiesOnCanvas,
    textsOnCanvas,
    imagesOnCanvas,
    toolIconsOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setTextsOnCanvas,
    setImagesOnCanvas,
    setToolIconsOnCanvas,
  } = useCanvasEntities();

  const {
    notifyAgentMoved,
    notifyAbilityMoved,
    notifyTextUpdated,
    notifyImageUpdated,
    notifyToolIconMoved,
  } = useCollaborativeCanvas();

  const getNote = useCallback(
    (target: CanvasSelectionItem): string => {
      switch (target.type) {
        case "agent":
          return (
            agentsOnCanvas.find((agent) => agent.id === target.id)?.note ?? ""
          );
        case "ability":
          return (
            abilitiesOnCanvas.find((ability) => ability.id === target.id)
              ?.note ?? ""
          );
        case "text":
          return textsOnCanvas.find((text) => text.id === target.id)?.note ?? "";
        case "image":
          return (
            imagesOnCanvas.find((image) => image.id === target.id)?.note ?? ""
          );
        case "tool":
          return (
            toolIconsOnCanvas.find((toolIcon) => toolIcon.id === target.id)
              ?.note ?? ""
          );
      }
    },
    [
      agentsOnCanvas,
      abilitiesOnCanvas,
      textsOnCanvas,
      imagesOnCanvas,
      toolIconsOnCanvas,
    ],
  );

  const updateNote = useCallback(
    (target: CanvasSelectionItem, note: string | undefined) => {
      switch (target.type) {
        case "agent": {
          const item = agentsOnCanvas.find(
            (agent) => agent.id === target.id,
          );
          if (!item) return;

          const updated = { ...item, note };
          setAgentsOnCanvas((previous) =>
            previous.map((agent) =>
              agent.id === updated.id ? updated : agent,
            ),
          );
          notifyAgentMoved(updated);
          return;
        }
        case "ability": {
          const item = abilitiesOnCanvas.find(
            (ability) => ability.id === target.id,
          );
          if (!item) return;

          const updated = { ...item, note };
          setAbilitiesOnCanvas((previous) =>
            previous.map((ability) =>
              ability.id === updated.id ? updated : ability,
            ),
          );
          notifyAbilityMoved(updated);
          return;
        }
        case "text": {
          const item = textsOnCanvas.find((text) => text.id === target.id);
          if (!item) return;

          const updated = { ...item, note };
          setTextsOnCanvas((previous) =>
            previous.map((text) => (text.id === updated.id ? updated : text)),
          );
          notifyTextUpdated(updated);
          return;
        }
        case "image": {
          const item = imagesOnCanvas.find((image) => image.id === target.id);
          if (!item) return;

          const updated = { ...item, note };
          setImagesOnCanvas((previous) =>
            previous.map((image) =>
              image.id === updated.id ? updated : image,
            ),
          );
          notifyImageUpdated(updated);
          return;
        }
        case "tool": {
          const item = toolIconsOnCanvas.find(
            (toolIcon) => toolIcon.id === target.id,
          );
          if (!item) return;

          const updated = { ...item, note };
          setToolIconsOnCanvas((previous) =>
            previous.map((toolIcon) =>
              toolIcon.id === updated.id ? updated : toolIcon,
            ),
          );
          notifyToolIconMoved(updated);
          return;
        }
      }
    },
    [
      agentsOnCanvas,
      abilitiesOnCanvas,
      textsOnCanvas,
      imagesOnCanvas,
      toolIconsOnCanvas,
      setAgentsOnCanvas,
      setAbilitiesOnCanvas,
      setTextsOnCanvas,
      setImagesOnCanvas,
      setToolIconsOnCanvas,
      notifyAgentMoved,
      notifyAbilityMoved,
      notifyTextUpdated,
      notifyImageUpdated,
      notifyToolIconMoved,
    ],
  );

  return { getNote, updateNote };
};
