import { AbilityIconItem, Agent } from "@/lib/types";
import { AGENT_ICON_CONFIGS } from "@/lib/consts";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/settings-context";
import { useCanvas } from "@/contexts/canvas-context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentAbilitiesProps {
  agent: Agent | null;
  sidebarOpen: boolean;
  onClose: () => void;
  onAbilityClick: (ability: AbilityIconItem | null) => void;
}

const AgentAbilities: React.FC<AgentAbilitiesProps> = ({
  agent,
  sidebarOpen,
  onClose,
  onAbilityClick,
}) => {
  const { agentsSettings } = useSettings();

  const { isAlly, selectedCanvasIcon } = useCanvas();

  const allyColor = agentsSettings.allyColor;
  const enemyColor = agentsSettings.enemyColor;

  if (!agent || !sidebarOpen) return null;

  return (
    <div className="fixed top-[25%] right-[calc(20rem+1rem)] z-50 w-20 rounded-lg border bg-popover p-3 shadow-md">
      <Button
        variant="default"
        size="icon"
        className="absolute -top-2 -right-2 rounded-full size-6"
        onClick={onClose}
      >
        <X />
        <span className="sr-only">Close</span>
      </Button>
      <div className="flex flex-col items-center gap-6">
        {AGENT_ICON_CONFIGS[agent.name]?.map((iconConfig) => {
          const isSelected = selectedCanvasIcon?.name === iconConfig.name;
          const borderColor = isAlly ? allyColor : enemyColor;

          const isThirdAbility =
            AGENT_ICON_CONFIGS[agent.name]?.[2]?.name === iconConfig.name;

          return (
            <Tooltip key={iconConfig.name}>
              <TooltipTrigger asChild>
                <Image
                  data-tour={
                    agent.name === "Brimstone" && isThirdAbility
                      ? "brimstone-third-ability"
                      : undefined
                  }
                  className={`rounded-md transition-transform duration-200 ${
                    isSelected ? `border-2 scale-110 shadow-lg` : "border"
                  }`}
                  style={{
                    borderColor: isSelected ? borderColor : "transparent",
                    cursor: "pointer",
                  }}
                  src={iconConfig.src}
                  alt={iconConfig.name}
                  width={50}
                  height={50}
                  draggable
                  onClick={() => onAbilityClick(iconConfig)}
                />
              </TooltipTrigger>
              <TooltipContent side="left">{iconConfig.name}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default AgentAbilities;
