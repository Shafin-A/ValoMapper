import {
  AbilityCanvas,
  AgentCanvas,
  ConnectingLine,
  DrawLine,
  ImageCanvas,
  PhaseState,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";
import { useCallback, useMemo } from "react";

const resolveValue = <T>(
  value: T[] | ((prev: T[]) => T[]),
  currentValue: T[]
): T[] => (typeof value === "function" ? value(currentValue) : value);

export const useCanvasItems = (
  currentPhase: PhaseState,
  updateCurrentPhase: (updates: Partial<PhaseState>) => void
) => {
  const {
    textsOnCanvas,
    imagesOnCanvas,
    agentsOnCanvas,
    abilitiesOnCanvas,
    drawLines,
    connectingLines = [],
    toolIconsOnCanvas,
  } = currentPhase;

  const setToolIconsOnCanvas = useCallback(
    (
      value: ToolIconCanvas[] | ((prev: ToolIconCanvas[]) => ToolIconCanvas[])
    ) => {
      updateCurrentPhase({
        toolIconsOnCanvas: resolveValue(value, toolIconsOnCanvas),
      });
    },
    [toolIconsOnCanvas, updateCurrentPhase]
  );

  const setTextsOnCanvas = useCallback(
    (value: TextCanvas[] | ((prev: TextCanvas[]) => TextCanvas[])) => {
      updateCurrentPhase({ textsOnCanvas: resolveValue(value, textsOnCanvas) });
    },
    [textsOnCanvas, updateCurrentPhase]
  );

  const setImagesOnCanvas = useCallback(
    (value: ImageCanvas[] | ((prev: ImageCanvas[]) => ImageCanvas[])) => {
      updateCurrentPhase({
        imagesOnCanvas: resolveValue(value, imagesOnCanvas),
      });
    },
    [imagesOnCanvas, updateCurrentPhase]
  );

  const setAgentsOnCanvas = useCallback(
    (value: AgentCanvas[] | ((prev: AgentCanvas[]) => AgentCanvas[])) => {
      updateCurrentPhase({
        agentsOnCanvas: resolveValue(value, agentsOnCanvas),
      });
    },
    [agentsOnCanvas, updateCurrentPhase]
  );

  const setAbilitiesOnCanvas = useCallback(
    (value: AbilityCanvas[] | ((prev: AbilityCanvas[]) => AbilityCanvas[])) => {
      updateCurrentPhase({
        abilitiesOnCanvas: resolveValue(value, abilitiesOnCanvas),
      });
    },
    [abilitiesOnCanvas, updateCurrentPhase]
  );

  const setDrawLines = useCallback(
    (value: DrawLine[] | ((prev: DrawLine[]) => DrawLine[])) => {
      updateCurrentPhase({ drawLines: resolveValue(value, drawLines) });
    },
    [drawLines, updateCurrentPhase]
  );

  const setConnectingLines = useCallback(
    (
      value: ConnectingLine[] | ((prev: ConnectingLine[]) => ConnectingLine[])
    ) => {
      updateCurrentPhase({
        connectingLines: resolveValue(value, connectingLines),
      });
    },
    [connectingLines, updateCurrentPhase]
  );

  return useMemo(
    () => ({
      agentsOnCanvas,
      setAgentsOnCanvas,
      abilitiesOnCanvas,
      setAbilitiesOnCanvas,
      drawLines,
      setDrawLines,
      connectingLines,
      setConnectingLines,
      imagesOnCanvas,
      setImagesOnCanvas,
      textsOnCanvas,
      setTextsOnCanvas,
      toolIconsOnCanvas,
      setToolIconsOnCanvas,
    }),
    [
      agentsOnCanvas,
      setAgentsOnCanvas,
      abilitiesOnCanvas,
      setAbilitiesOnCanvas,
      drawLines,
      setDrawLines,
      connectingLines,
      setConnectingLines,
      imagesOnCanvas,
      setImagesOnCanvas,
      textsOnCanvas,
      setTextsOnCanvas,
      toolIconsOnCanvas,
      setToolIconsOnCanvas,
    ]
  );
};
