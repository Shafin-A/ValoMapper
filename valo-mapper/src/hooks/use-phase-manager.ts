import { PhaseState } from "@/lib/types";
import { useState, useCallback } from "react";

const createEmptyPhaseState = (): PhaseState => ({
  agentsOnCanvas: [],
  abilitiesOnCanvas: [],
  drawLines: [],
  textsOnCanvas: [],
  imagesOnCanvas: [],
});

export const usePhaseManager = () => {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phases, setPhases] = useState<PhaseState[]>(
    Array.from({ length: 10 }, () => createEmptyPhaseState())
  );
  const [editedPhases, setEditedPhases] = useState<Set<number>>(new Set([0]));

  const currentPhase = phases[currentPhaseIndex];

  const updateCurrentPhase = useCallback(
    (updates: Partial<PhaseState>) => {
      setPhases((prevPhases) => {
        const newPhases = [...prevPhases];
        newPhases[currentPhaseIndex] = {
          ...newPhases[currentPhaseIndex],
          ...updates,
        };
        return newPhases;
      });
      setEditedPhases((prev) => new Set(prev).add(currentPhaseIndex));
    },
    [currentPhaseIndex]
  );

  const switchToPhase = useCallback(
    (index: number) => {
      if (index < 0 || index > 9) return;

      if (!editedPhases.has(index)) {
        const editedPhasesBeforeCurrent = Array.from(editedPhases).filter(
          (p) => p < index
        );
        const highestEditedPhase =
          editedPhasesBeforeCurrent.length > 0
            ? Math.max(...editedPhasesBeforeCurrent)
            : 0;
        const phaseToClone = phases[highestEditedPhase];
        const clonedPhase = JSON.parse(JSON.stringify(phaseToClone));

        setPhases((prev) => {
          const newPhases = [...prev];
          newPhases[index] = clonedPhase;
          return newPhases;
        });
      }

      setCurrentPhaseIndex(index);
    },
    [editedPhases, phases]
  );

  const deletePhase = useCallback((index: number) => {
    setPhases((prev) => {
      const newPhases = [...prev];
      newPhases[index] = createEmptyPhaseState();
      return newPhases;
    });
    setEditedPhases((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      newSet.add(0);
      return newSet;
    });
  }, []);

  const duplicatePhase = useCallback(
    (index: number) => {
      if (index < 9) {
        const duplicated = JSON.parse(JSON.stringify(phases[index]));
        setPhases((prev) => {
          const newPhases = [...prev];
          newPhases[index + 1] = duplicated;
          return newPhases;
        });
        setEditedPhases((prev) => new Set(prev).add(index + 1));
        setCurrentPhaseIndex(index + 1);
      }
    },
    [phases]
  );

  const resetAllPhases = useCallback(() => {
    setPhases(Array.from({ length: 10 }, () => createEmptyPhaseState()));
    setEditedPhases(new Set([0]));
    setCurrentPhaseIndex(0);
  }, []);

  return {
    phases,
    setPhases,
    currentPhase,
    currentPhaseIndex,
    setCurrentPhaseIndex,
    switchToPhase,
    duplicatePhase,
    editedPhases,
    setEditedPhases,
    deletePhase,
    updateCurrentPhase,
    resetAllPhases,
  };
};
