import { PhaseState } from "@/lib/types";
import { useState, useCallback, useRef } from "react";

const DEFAULT_PHASE_COUNT = 10;

const createEmptyPhaseState = (): PhaseState => ({
  agentsOnCanvas: [],
  abilitiesOnCanvas: [],
  drawLines: [],
  connectingLines: [],
  textsOnCanvas: [],
  imagesOnCanvas: [],
  toolIconsOnCanvas: [],
});

interface UsePhaseManagerOptions {
  initialCurrentPhaseIndex?: number;
  initialEditedPhases?: Iterable<number>;
  initialPhases?: PhaseState[];
  initialPhaseCount?: number;
}

const createInitialPhases = (
  initialPhases?: PhaseState[],
  initialPhaseCount: number = DEFAULT_PHASE_COUNT,
) => {
  if (initialPhases && initialPhases.length > 0) {
    return initialPhases;
  }

  return Array.from(
    { length: Math.max(initialPhaseCount, 1) },
    createEmptyPhaseState,
  );
};

export const usePhaseManager = ({
  initialCurrentPhaseIndex = 0,
  initialEditedPhases,
  initialPhases,
  initialPhaseCount = DEFAULT_PHASE_COUNT,
}: UsePhaseManagerOptions = {}) => {
  const initialPhasesRef = useRef(
    createInitialPhases(initialPhases, initialPhaseCount),
  );
  const maxInitialIndex = initialPhasesRef.current.length - 1;
  const clampedInitialPhaseIndex = Math.min(
    Math.max(initialCurrentPhaseIndex, 0),
    maxInitialIndex,
  );
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(
    clampedInitialPhaseIndex,
  );
  const [phases, setPhases] = useState<PhaseState[]>(initialPhasesRef.current);
  const [editedPhases, setEditedPhases] = useState<Set<number>>(
    new Set(initialEditedPhases ?? [clampedInitialPhaseIndex]),
  );

  const phasesRef = useRef(phases);
  const defaultPhaseCountRef = useRef(initialPhasesRef.current.length);

  const setPhasesWithRef = useCallback(
    (updater: PhaseState[] | ((prevPhases: PhaseState[]) => PhaseState[])) => {
      setPhases((prevPhases) => {
        const newPhases =
          typeof updater === "function" ? updater(prevPhases) : updater;
        phasesRef.current = newPhases;
        return newPhases;
      });
    },
    [],
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
    [currentPhaseIndex, setPhasesWithRef],
  );

  const switchToPhase = useCallback(
    (index: number) => {
      if (index < 0 || index > phases.length - 1) return;

      if (!editedPhases.has(index)) {
        const editedPhasesBeforeCurrent = Array.from(editedPhases).filter(
          (p) => p < index,
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
    [editedPhases, phases, setPhasesWithRef],
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
    [setPhasesWithRef],
  );

  const duplicatePhase = useCallback(
    (index: number) => {
      if (index < phases.length - 1) {
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
    [phases, setPhasesWithRef],
  );

  const resetAllPhases = useCallback(() => {
    setPhasesWithRef(
      Array.from(
        { length: defaultPhaseCountRef.current },
        createEmptyPhaseState,
      ),
    );
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
