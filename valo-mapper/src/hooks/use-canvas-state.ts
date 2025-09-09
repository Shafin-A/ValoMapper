import { useState } from "react";
import type {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
} from "@/lib/types";

export const useCanvasState = () => {
  const [agentsOnCanvas, setAgentsOnCanvas] = useState<AgentCanvas[]>([]);
  const [abilitiesOnCanvas, setAbilitiesOnCanvas] = useState<AbilityCanvas[]>(
    []
  );
  const [selectedCanvasIcon, setSelectedCanvasIcon] = useState<
    Agent | AbilityIconItem | null
  >(null);

  return {
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    selectedCanvasIcon,
    setSelectedCanvasIcon,
  };
};
