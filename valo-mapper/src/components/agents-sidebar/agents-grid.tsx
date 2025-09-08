import { ScrollArea } from "@/components/ui/scroll-area";
import { AGENTS } from "@/lib/consts";
import Image from "next/image";
import { AgentCanvas, Agent, AgentRole } from "@/lib/types";

interface AgentsGridProps {
  selectedRole: AgentRole | "All";
  onMap: boolean;
  agentsOnCanvas: AgentCanvas[];
  isAlly: boolean;
  stageScale: number;
  onAgentClick: (agent: Agent | null) => void;
}

export const AgentsGrid: React.FC<AgentsGridProps> = ({
  selectedRole,
  onMap,
  agentsOnCanvas,
  onAgentClick,
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

  return (
    <ScrollArea className="h-full w-full">
      <div className="grid grid-cols-4 gap-4 p-2">
        {filteredAgents.map((agent) => (
          <Image
            key={agent.name}
            title={agent.name}
            src={agent.src}
            alt={agent.name}
            width={50}
            height={50}
            draggable
            style={{ cursor: "pointer" }}
            onClick={() => onAgentClick(agent)}
          />
        ))}
      </div>
    </ScrollArea>
  );
};
