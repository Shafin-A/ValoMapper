import { ScrollArea } from "@/components/ui/scroll-area";
import { AGENTS } from "@/lib/consts";
import Image from "next/image";
import { AgentCanvas, Agent, IconSettings, AgentRole } from "@/lib/types";
import { setupDragPreviewImage } from "@/lib/utils";

interface AgentsGridProps {
  selectedRole: AgentRole | "All";
  onMap: boolean;
  agentsOnCanvas: AgentCanvas[];
  agentsSettings: IconSettings;
  isAlly: boolean;
  onAgentClick: (agent: Agent | null) => void;
}

export const AgentsGrid: React.FC<AgentsGridProps> = ({
  selectedRole,
  onMap,
  agentsOnCanvas,
  agentsSettings,
  isAlly,
  onAgentClick,
}) => {
  const handleDragStart = (
    e: React.DragEvent<HTMLImageElement>,
    agent: Agent
  ) => {
    setupDragPreviewImage(
      e as unknown as DragEvent,
      e.currentTarget,
      agentsSettings,
      isAlly
    );

    const agentCanvas: AgentCanvas = {
      ...agent,
      id: agentsOnCanvas.length,
      isAlly,
      x: 0,
      y: 0,
    };
    e.dataTransfer.setData("agent", JSON.stringify(agentCanvas));
  };

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
            style={{ cursor: "grab" }}
            onClick={() => onAgentClick(agent)}
            onDragStart={(e) => handleDragStart(e, agent)}
          />
        ))}
      </div>
    </ScrollArea>
  );
};
