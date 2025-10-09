import { usePhaseTransitions } from "@/hooks/use-phase-transition";
import { usePhaseManager } from "./use-phase-manager";
import { useCanvasItems } from "./use-canvas-items";
import { useHistoryManager } from "./use-history-manager";
import { useCanvasUI } from "./use-canvas-ui";
import { useCallback } from "react";

export const useCanvasState = () => {
  const phaseTransitions = usePhaseTransitions();
  const canvasUI = useCanvasUI();
  const phaseManager = usePhaseManager();

  const canvasItems = useCanvasItems(
    phaseManager.currentPhase,
    phaseManager.updateCurrentPhase
  );

  const historyManager = useHistoryManager({
    getCurrentState: () => ({
      agentsOnCanvas: canvasItems.agentsOnCanvas,
      abilitiesOnCanvas: canvasItems.abilitiesOnCanvas,
      drawLines: canvasItems.drawLines,
      textsOnCanvas: canvasItems.textsOnCanvas,
      imagesOnCanvas: canvasItems.imagesOnCanvas,
      selectedMap: canvasUI.selectedMap,
      mapSide: canvasUI.mapSide,
      currentPhaseIndex: phaseManager.currentPhaseIndex,
    }),
    applyState: (state) => {
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
