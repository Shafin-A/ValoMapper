import { PhaseState } from "@/lib/types";
import { useState, useCallback, useRef } from "react";

const createEmptyPhaseState = (): PhaseState => ({
  agentsOnCanvas: [],
  abilitiesOnCanvas: [],
  drawLines: [],
  connectingLines: [],
  textsOnCanvas: [],
  imagesOnCanvas: [],
  toolIconsOnCanvas: [],
});

export const usePhaseManager = () => {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phases, setPhases] = useState<PhaseState[]>(
    Array.from({ length: 10 }, () => createEmptyPhaseState())
  );
  const [editedPhases, setEditedPhases] = useState<Set<number>>(new Set([0]));

  const phasesRef = useRef(phases);

  const setPhasesWithRef = useCallback(
    (updater: PhaseState[] | ((prevPhases: PhaseState[]) => PhaseState[])) => {
      setPhases((prevPhases) => {
        const newPhases =
          typeof updater === "function" ? updater(prevPhases) : updater;
        phasesRef.current = newPhases;
        return newPhases;
      });
    },
    []
  );

  const currentPhase = phases[currentPhaseIndex];

  const updateCurrentPhase = useCallback(
    (updates: Partial<PhaseState>) => {
      setPhasesWithRef((prevPhases) => {
        const newPhases = [...prevPhases];
        newPhases[currentPhaseIndex] = {
          ...newPhases[currentPhaseIndex],
          ...updates,
        };
        return newPhases;
      });
      setEditedPhases((prev) => new Set(prev).add(currentPhaseIndex));
    },
    [currentPhaseIndex, setPhasesWithRef]
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

        setPhasesWithRef((prev) => {
          const newPhases = [...prev];
          newPhases[index] = clonedPhase;
          return newPhases;
        });
      }

      setCurrentPhaseIndex(index);
    },
    [editedPhases, phases, setPhasesWithRef]
  );

  const deletePhase = useCallback(
    (index: number) => {
      setPhasesWithRef((prev) => {
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
    },
    [setPhasesWithRef]
  );

  const duplicatePhase = useCallback(
    (index: number) => {
      if (index < 9) {
        const duplicated = JSON.parse(JSON.stringify(phases[index]));
        setPhasesWithRef((prev) => {
          const newPhases = [...prev];
          newPhases[index + 1] = duplicated;
          return newPhases;
        });
        setEditedPhases((prev) => new Set(prev).add(index + 1));
        setCurrentPhaseIndex(index + 1);
      }
    },
    [phases, setPhasesWithRef]
  );

  const resetAllPhases = useCallback(() => {
    setPhasesWithRef(Array.from({ length: 10 }, () => createEmptyPhaseState()));
    setEditedPhases(new Set([0]));
    setCurrentPhaseIndex(0);
  }, [setPhasesWithRef]);

  const getLatestPhases = useCallback(() => phasesRef.current, []);

  return {
    phases,
    setPhases: setPhasesWithRef,
    getLatestPhases,
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
