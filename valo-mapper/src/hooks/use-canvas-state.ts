import { useCanvasItems } from "@/hooks/use-canvas-items";
import { useCanvasUI } from "@/hooks/use-canvas-ui";
import { useHistoryManager } from "@/hooks/use-history-manager";
import { usePhaseManager } from "@/hooks/use-phase-manager";
import { usePhaseTransitions } from "@/hooks/use-phase-transition";
import { useCallback } from "react";

export const useCanvasState = () => {
  const phaseTransitions = usePhaseTransitions();
  const canvasUI = useCanvasUI();
  const phaseManager = usePhaseManager();

  const canvasItems = useCanvasItems(
    phaseManager.currentPhase,
    phaseManager.updateCurrentPhase
  );

  const getCurrentState = useCallback(
    () => ({
      agentsOnCanvas: canvasItems.agentsOnCanvas,
      abilitiesOnCanvas: canvasItems.abilitiesOnCanvas,
      drawLines: canvasItems.drawLines,
      textsOnCanvas: canvasItems.textsOnCanvas,
      imagesOnCanvas: canvasItems.imagesOnCanvas,
      selectedMap: canvasUI.selectedMap,
      mapSide: canvasUI.mapSide,
      currentPhaseIndex: phaseManager.currentPhaseIndex,
    }),
    [
      canvasItems.agentsOnCanvas,
      canvasItems.abilitiesOnCanvas,
      canvasItems.drawLines,
      canvasItems.textsOnCanvas,
      canvasItems.imagesOnCanvas,
      canvasUI.selectedMap,
      canvasUI.mapSide,
      phaseManager.currentPhaseIndex,
    ]
  );

  const applyState = useCallback(
    (state: ReturnType<typeof getCurrentState>) => {
      if (state.currentPhaseIndex !== undefined) {
        phaseManager.setCurrentPhaseIndex(state.currentPhaseIndex);
        phaseManager.setEditedPhases((prev) =>
          new Set(prev).add(state.currentPhaseIndex)
        );
      }

      phaseManager.updateCurrentPhase({
        agentsOnCanvas: state.agentsOnCanvas,
        abilitiesOnCanvas: state.abilitiesOnCanvas,
        drawLines: state.drawLines,
        textsOnCanvas: state.textsOnCanvas,
        imagesOnCanvas: state.imagesOnCanvas,
      });

      canvasUI.setSelectedMap(state.selectedMap);
      canvasUI.setMapSide(state.mapSide);
    },
    [phaseManager, canvasUI]
  );

  const historyManager = useHistoryManager({
    getCurrentState,
    applyState,
  });

  const resetState = useCallback(
    (resetAllPhases = false) => {
      if (resetAllPhases) {
        phaseManager.resetAllPhases();
      } else {
        phaseManager.deletePhase(phaseManager.currentPhaseIndex);
      }
      canvasUI.resetEdits();
    },
    [phaseManager, canvasUI]
  );

  return {
    ...phaseManager,
    ...phaseTransitions,
    ...canvasItems,
    ...historyManager,
    ...canvasUI,
    resetState,
  };
};
