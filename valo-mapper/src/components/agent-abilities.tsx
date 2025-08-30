import { Agent } from "@/lib/types";
import { AGENT_ICON_CONFIGS } from "@/lib/consts";
import Image from "next/image";
import { createPortal } from "react-dom";

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

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="fixed top-[25%] right-[calc(20rem+1rem)] z-50 w-20 rounded-lg border bg-popover p-3 text-popover-foreground shadow-md">
        <div className="flex flex-col items-center space-y-4">
          {AGENT_ICON_CONFIGS[agent.name]?.map((iconConfig) => (
            <div
              key={iconConfig.id}
              className="w-8 h-8 not-last:rounded-full flex items-center justify-center cursor-pointer transition-colors"
              title={iconConfig.label}
            >
              <span className="text-xs">
                <Image
                  src={iconConfig.icon}
                  alt={iconConfig.label}
                  width={50}
                  height={50}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
};

export default AgentAbilities;
