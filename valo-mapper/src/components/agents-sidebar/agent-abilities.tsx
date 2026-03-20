import { useState } from "react";
import { AbilityIconDefinition, AbilityIconItem, Agent } from "@/lib/types";
import { AGENT_ICON_CONFIGS } from "@/lib/consts";
import Image from "next/image";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/settings-context";
import { useCanvas } from "@/contexts/canvas-context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAbilityVariants } from "@/lib/consts/configs/agent-icon/consts";
import { isAgent } from "@/lib/utils";

interface AgentAbilitiesProps {
  agent: Agent | null;
  sidebarOpen: boolean;
  onClose: () => void;
  onAbilityClick: (ability: AbilityIconItem | null) => void;
  onAbilitySwap: (ability: AbilityIconDefinition) => void;
  resolveAbility: (ability: AbilityIconDefinition) => AbilityIconItem;
  onAbilityPointerDown: (
    event: React.PointerEvent,
    ability: AbilityIconItem | null,
  ) => void;
}

const AgentAbilities: React.FC<AgentAbilitiesProps> = ({
  agent,
  sidebarOpen,
  onClose,
  onAbilityClick,
  onAbilitySwap,
  resolveAbility,
  onAbilityPointerDown,
}) => {
  const { agentsSettings } = useSettings();

  const { isAlly, selectedCanvasIcon } = useCanvas();

  const allyColor = agentsSettings.allyColor;
  const enemyColor = agentsSettings.enemyColor;

  const [swappingId, setSwappingId] = useState<string | null>(null);

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
          const resolvedAbility = resolveAbility(iconConfig);
          const isSelected =
            !!selectedCanvasIcon &&
            !isAgent(selectedCanvasIcon) &&
            selectedCanvasIcon.id === resolvedAbility.id;
          const borderColor = isAlly ? allyColor : enemyColor;

          const variants = getAbilityVariants(iconConfig);
          const canSwap = variants.length > 1;
          const currentIndex = variants.findIndex(
            (v) => v.id === resolvedAbility.id,
          );
          const nextVariant = canSwap
            ? variants[(currentIndex + 1) % variants.length]
            : null;

          const isThirdAbility =
            AGENT_ICON_CONFIGS[agent.name]?.[2]?.name === iconConfig.name;

          return (
            <div key={iconConfig.id} className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Image
                    data-tour={
                      agent.name === "Brimstone" && isThirdAbility
                        ? "brimstone-third-ability"
                        : undefined
                    }
                    className={`rounded-md transition-transform duration-200 ${
                      isSelected ? `border-2 scale-110 shadow-lg` : "border"
                    } ${swappingId === iconConfig.id ? "animate-[ability-pop_0.3s_ease-out]" : ""}`}
                    style={{
                      borderColor: isSelected ? borderColor : "transparent",
                      cursor: "pointer",
                      touchAction: "none",
                      WebkitTouchCallout: "none",
                    }}
                    src={resolvedAbility.src}
                    alt={resolvedAbility.name}
                    width={50}
                    height={50}
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                    onPointerDown={(event) =>
                      onAbilityPointerDown(event, resolvedAbility)
                    }
                    onClick={() => onAbilityClick(resolvedAbility)}
                  />
                </TooltipTrigger>
                <TooltipContent side="left">
                  {resolvedAbility.name}
                </TooltipContent>
              </Tooltip>

              {canSwap && nextVariant && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute -top-2 -left-2 size-5 rounded-full shadow-sm"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSwappingId(iconConfig.id);
                        onAbilitySwap(iconConfig);
                        setTimeout(() => setSwappingId(null), 450);
                      }}
                    >
                      <RefreshCw
                        className={`size-3 ${
                          swappingId === iconConfig.id
                            ? "animate-[spin-once_0.4s_ease-in-out]"
                            : ""
                        }`}
                      />
                      <span className="sr-only">
                        Swap to {nextVariant.name}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    Switch to {nextVariant.name}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentAbilities;
