import { ScrollArea } from "@/components/ui/scroll-area";
import { AGENTS } from "@/lib/consts";
import Image from "next/image";
import { AgentCanvas, Agent, AgentRole } from "@/lib/types";
import { useSettings } from "@/contexts/settings-context";
import { EllipsisVertical } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

interface AgentsGridProps {
  selectedRole: AgentRole | "All";
  onMap: boolean;
  agentsOnCanvas: AgentCanvas[];
  isAlly: boolean;
  onAgentClick: (agent: Agent | null) => void;
  selectedAgent: Agent | null;
  setSelectedAgent: React.Dispatch<React.SetStateAction<Agent | null>>;
  selectedAgentAbilities: Agent | null;
  setSelectedAgentAbilities: React.Dispatch<React.SetStateAction<Agent | null>>;
}

export const AgentsGrid: React.FC<AgentsGridProps> = ({
  selectedRole,
  onMap,
  agentsOnCanvas,
  onAgentClick,
  isAlly,
  selectedAgent,
  setSelectedAgent,
  selectedAgentAbilities,
  setSelectedAgentAbilities,
}) => {
  const agentsByRole =
    selectedRole === "All"
      ? AGENTS
      : AGENTS.filter((agent) => agent.role === selectedRole);

  const filteredAgents = agentsByRole.filter((agent) =>
    onMap
      ? agentsOnCanvas.some((canvasAgent) => canvasAgent.name === agent.name)
      : true
  );

  const { agentsSettings } = useSettings();

  const allyColor = agentsSettings.allyColor;
  const enemyColor = agentsSettings.enemyColor;

  return (
    <ScrollArea className="h-full w-full">
      <div className="grid grid-cols-4 gap-4 p-2">
        {filteredAgents.map((agent) => {
          const isSelected = selectedAgent?.name === agent.name;
          const borderColor = isAlly ? allyColor : enemyColor;

          return (
            <div key={agent.name} className="relative inline-block">
              <Image
                className={`rounded-md transition-transform duration-200 ${
                  isSelected ? `border-2 scale-110 shadow-lg` : "border"
                }`}
                style={{
                  borderColor: isSelected ? borderColor : "transparent",
                  cursor: "pointer",
                }}
                title={agent.name}
                src={agent.src}
                alt={agent.name}
                width={50}
                height={50}
                draggable
                onClick={() => onAgentClick(agent)}
              />

              <Toggle
                size="icon"
                className="absolute -top-2 -right-2 rounded-full"
                pressed={selectedAgentAbilities?.name === agent.name}
                onClick={() => {
                  setSelectedAgent(null);
                  if (selectedAgentAbilities?.name === agent.name) {
                    setSelectedAgentAbilities(null);
                    return;
                  }
                  setSelectedAgentAbilities(agent);
                }}
              >
                <EllipsisVertical />
                <span className="sr-only">Abilities</span>
              </Toggle>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
