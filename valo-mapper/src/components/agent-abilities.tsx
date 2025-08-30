import { Agent } from "@/lib/types";
import { AGENT_ICON_CONFIGS } from "@/lib/consts";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentAbilitiesProps {
  agent: Agent | null;
  sidebarOpen: boolean;
  onClose: () => void;
}

const AgentAbilities: React.FC<AgentAbilitiesProps> = ({
  agent,
  sidebarOpen,
  onClose,
}) => {
  if (!agent || !sidebarOpen) return null;

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    iconConfig: { id: string; icon: string; label: string; action: string }
  ) => {
    const abilityData = {
      name: agent.name,
      src: iconConfig.icon,
      role: agent.role,
      isAlly: true,
      isAbility: true,
      abilityLabel: iconConfig.label,
    };
    e.dataTransfer.setData("agent", JSON.stringify(abilityData));
  };

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
          <div
            key={iconConfig.id}
            title={iconConfig.label}
            draggable
            onDragStart={(e) => handleDragStart(e, iconConfig)}
          >
            <Image
              src={iconConfig.icon}
              alt={iconConfig.label}
              width={50}
              height={50}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentAbilities;
