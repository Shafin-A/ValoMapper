import {
  AbilityCanvas,
  AgentCanvas,
  DrawLine,
  ImageCanvas,
  PhaseState,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";
import { useCallback } from "react";

export const useCanvasItems = (
  currentPhase: PhaseState,
  updateCurrentPhase: (updates: Partial<PhaseState>) => void
) => {
  const textsOnCanvas = currentPhase.textsOnCanvas;
  const imagesOnCanvas = currentPhase.imagesOnCanvas;
  const agentsOnCanvas = currentPhase.agentsOnCanvas;
  const abilitiesOnCanvas = currentPhase.abilitiesOnCanvas;
  const drawLines = currentPhase.drawLines;
  const toolIconsOnCanvas = currentPhase.toolIconsOnCanvas;

  const setToolIconsOnCanvas = useCallback(
    (
      value: ToolIconCanvas[] | ((prev: ToolIconCanvas[]) => ToolIconCanvas[])
    ) => {
      const newValue =
        typeof value === "function" ? value(toolIconsOnCanvas) : value;
      updateCurrentPhase({ toolIconsOnCanvas: newValue });
    },
    [toolIconsOnCanvas, updateCurrentPhase]
  );

  const setTextsOnCanvas = useCallback(
    (value: TextCanvas[] | ((prev: TextCanvas[]) => TextCanvas[])) => {
      const newValue =
        typeof value === "function" ? value(textsOnCanvas) : value;
      updateCurrentPhase({ textsOnCanvas: newValue });
    },
    [textsOnCanvas, updateCurrentPhase]
  );

  const setImagesOnCanvas = useCallback(
    (value: ImageCanvas[] | ((prev: ImageCanvas[]) => ImageCanvas[])) => {
      const newValue =
        typeof value === "function" ? value(imagesOnCanvas) : value;
      updateCurrentPhase({ imagesOnCanvas: newValue });
    },
    [imagesOnCanvas, updateCurrentPhase]
  );

  const setAgentsOnCanvas = useCallback(
    (value: AgentCanvas[] | ((prev: AgentCanvas[]) => AgentCanvas[])) => {
      const newValue =
        typeof value === "function" ? value(agentsOnCanvas) : value;
      updateCurrentPhase({ agentsOnCanvas: newValue });
    },
    [agentsOnCanvas, updateCurrentPhase]
  );

  const setAbilitiesOnCanvas = useCallback(
    (value: AbilityCanvas[] | ((prev: AbilityCanvas[]) => AbilityCanvas[])) => {
      const newValue =
        typeof value === "function" ? value(abilitiesOnCanvas) : value;
      updateCurrentPhase({ abilitiesOnCanvas: newValue });
    },
    [abilitiesOnCanvas, updateCurrentPhase]
  );

  const setDrawLines = useCallback(
    (value: DrawLine[] | ((prev: DrawLine[]) => DrawLine[])) => {
      const newValue = typeof value === "function" ? value(drawLines) : value;
      updateCurrentPhase({ drawLines: newValue });
    },
    [drawLines, updateCurrentPhase]
  );

  return {
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    drawLines,
    setDrawLines,
    imagesOnCanvas,
    setImagesOnCanvas,
    textsOnCanvas,
    setTextsOnCanvas,
    toolIconsOnCanvas,
    setToolIconsOnCanvas,
  };
};
