import { useState } from "react";
import type {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  MapOption,
} from "@/lib/types";
import { MAP_OPTIONS } from "@/lib/consts";

export const useCanvasState = () => {
  const [agentsOnCanvas, setAgentsOnCanvas] = useState<AgentCanvas[]>([]);
  const [abilitiesOnCanvas, setAbilitiesOnCanvas] = useState<AbilityCanvas[]>(
    []
  );
  const [selectedCanvasIcon, setSelectedCanvasIcon] = useState<
    Agent | AbilityIconItem | null
  >(null);

  const [isAlly, setIsAlly] = useState(true);

  const [selectedMap, setSelectedMap] = useState<MapOption>(MAP_OPTIONS[1]);

  return {
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    isAlly,
    setIsAlly,
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    selectedMap,
    setSelectedMap,
  };
};
