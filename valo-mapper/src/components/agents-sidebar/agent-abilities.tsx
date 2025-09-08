import { AbilityCanvas, Agent } from "@/lib/types";
import { AGENT_ICON_CONFIGS } from "@/lib/consts";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentAbilitiesProps {
  agent: Agent | null;
  sidebarOpen: boolean;
  abilitiesOnCanvas: AbilityCanvas[];
  isAlly: boolean;
  stageScale: number;
  onClose: () => void;
}

const AgentAbilities: React.FC<AgentAbilitiesProps> = ({
  agent,
  sidebarOpen,
  onClose,
}) => {
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
        {AGENT_ICON_CONFIGS[agent.name]?.map((iconConfig) => (
          <Image
            key={iconConfig.label}
            title={iconConfig.label}
            src={iconConfig.icon}
            alt={iconConfig.label}
            width={50}
            height={50}
            draggable
            style={{ cursor: "grab" }}
          />
        ))}
      </div>
    </div>
  );
};

export default AgentAbilities;
