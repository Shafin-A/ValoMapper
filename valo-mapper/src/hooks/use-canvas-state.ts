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

  const [isAlly, setIsAlly] = useState(true);

  return {
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    isAlly,
    setIsAlly,
    selectedCanvasIcon,
    setSelectedCanvasIcon,
  };
};
