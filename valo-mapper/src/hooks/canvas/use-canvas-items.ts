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
import { PhaseStateUpdate } from "@/hooks/canvas/use-phase-manager";
import { useCallback, useMemo } from "react";

const resolveValue = <T>(
  value: T[] | ((prev: T[]) => T[]),
  currentValue: T[],
): T[] => (typeof value === "function" ? value(currentValue) : value);

export const useCanvasItems = (
  currentPhase: PhaseState,
  updateCurrentPhase: (updates: PhaseStateUpdate) => void,
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
      value: ToolIconCanvas[] | ((prev: ToolIconCanvas[]) => ToolIconCanvas[]),
    ) => {
      updateCurrentPhase((phase) => ({
        toolIconsOnCanvas: resolveValue(value, phase.toolIconsOnCanvas),
      }));
    },
    [updateCurrentPhase],
  );

  const setTextsOnCanvas = useCallback(
    (value: TextCanvas[] | ((prev: TextCanvas[]) => TextCanvas[])) => {
      updateCurrentPhase((phase) => ({
        textsOnCanvas: resolveValue(value, phase.textsOnCanvas),
      }));
    },
    [updateCurrentPhase],
  );

  const setImagesOnCanvas = useCallback(
    (value: ImageCanvas[] | ((prev: ImageCanvas[]) => ImageCanvas[])) => {
      updateCurrentPhase((phase) => ({
        imagesOnCanvas: resolveValue(value, phase.imagesOnCanvas),
      }));
    },
    [updateCurrentPhase],
  );

  const setAgentsOnCanvas = useCallback(
    (value: AgentCanvas[] | ((prev: AgentCanvas[]) => AgentCanvas[])) => {
      updateCurrentPhase((phase) => ({
        agentsOnCanvas: resolveValue(value, phase.agentsOnCanvas),
      }));
    },
    [updateCurrentPhase],
  );

  const setAbilitiesOnCanvas = useCallback(
    (value: AbilityCanvas[] | ((prev: AbilityCanvas[]) => AbilityCanvas[])) => {
      updateCurrentPhase((phase) => ({
        abilitiesOnCanvas: resolveValue(value, phase.abilitiesOnCanvas),
      }));
    },
    [updateCurrentPhase],
  );

  const setDrawLines = useCallback(
    (value: DrawLine[] | ((prev: DrawLine[]) => DrawLine[])) => {
      updateCurrentPhase((phase) => ({
        drawLines: resolveValue(value, phase.drawLines),
      }));
    },
    [updateCurrentPhase],
  );

  const setConnectingLines = useCallback(
    (
      value: ConnectingLine[] | ((prev: ConnectingLine[]) => ConnectingLine[]),
    ) => {
      updateCurrentPhase((phase) => ({
        connectingLines: resolveValue(value, phase.connectingLines),
      }));
    },
    [updateCurrentPhase],
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
    ],
  );
};
