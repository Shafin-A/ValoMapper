import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanvas } from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { AGENTS } from "@/lib/consts";
import { Agent, AgentRole } from "@/lib/types";
import { getAgentImgSrc } from "@/lib/utils";
import { EllipsisVertical, Users } from "lucide-react";
import Image from "next/image";

interface AgentsGridProps {
  selectedRole: AgentRole | "All";
  onMap: boolean;
  onAgentClick: (agent: Agent | null) => void;
  selectedAgentAbilities: Agent | null;
  setSelectedAgentAbilities: React.Dispatch<React.SetStateAction<Agent | null>>;
}

export const AgentsGrid: React.FC<AgentsGridProps> = ({
  selectedRole,
  onMap,
  onAgentClick,
  selectedAgentAbilities,
  setSelectedAgentAbilities,
}) => {
  const { agentsSettings } = useSettings();

  const { agentsOnCanvas, isAlly, selectedCanvasIcon, setSelectedCanvasIcon } =
    useCanvas();

  const allyColor = agentsSettings.allyColor;
  const enemyColor = agentsSettings.enemyColor;

  const agentsByRole =
    selectedRole === "All"
      ? AGENTS
      : AGENTS.filter((agent) => agent.role === selectedRole);

  const filteredAgents = onMap
    ? agentsByRole.filter((agent) =>
        agentsOnCanvas.some((canvasAgent) => canvasAgent.name === agent.name)
      )
    : agentsByRole;

  return (
    <ScrollArea className="h-full w-full">
      {filteredAgents.length === 0 ? (
        <div className="flex items-center justify-center ">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
            </EmptyHeader>
            <EmptyTitle>
              {selectedRole === "All"
                ? "No agents on map"
                : `No ${selectedRole.toLowerCase()} agents on map`}
            </EmptyTitle>
            <EmptyDescription>
              {selectedRole === "All"
                ? "Add agents to the map to see them here"
                : `Add ${selectedRole.toLowerCase()} agents to the map to see them here`}
            </EmptyDescription>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 p-2">
          {filteredAgents.map((agent) => {
            const isSelected = selectedCanvasIcon?.name === agent.name;
            const borderColor = isAlly ? allyColor : enemyColor;

            return (
              <div key={agent.name} className="relative inline-block">
                <Tooltip delayDuration={700}>
                  <TooltipTrigger>
                    <Image
                      data-tour={
                        agent.name === "Brimstone"
                          ? "agent-brimstone"
                          : undefined
                      }
                      className={`rounded-md transition-transform duration-200 ${
                        isSelected ? `border-2 scale-110 shadow-lg` : "border"
                      }`}
                      style={{
                        borderColor: isSelected ? borderColor : "transparent",
                        cursor: "pointer",
                      }}
                      src={getAgentImgSrc(agent.name)}
                      alt={agent.name}
                      width={50}
                      height={50}
                      draggable
                      onClick={() => onAgentClick(agent)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{agent.name}</TooltipContent>
                </Tooltip>

                <Tooltip delayDuration={700}>
                  <TooltipTrigger asChild>
                    <Toggle
                      data-tour={
                        agent.name === "Brimstone"
                          ? "brimstone-abilities-button"
                          : undefined
                      }
                      size="icon"
                      className="absolute -top-2 -right-2 rounded-full"
                      data-state={
                        selectedAgentAbilities?.name === agent.name
                          ? "on"
                          : "off"
                      }
                      pressed={selectedAgentAbilities?.name === agent.name}
                      onPressedChange={(pressed) => {
                        setSelectedCanvasIcon(null);
                        if (pressed) {
                          setSelectedAgentAbilities(agent);
                        } else {
                          setSelectedAgentAbilities(null);
                        }
                      }}
                    >
                      <EllipsisVertical />
                      <span className="sr-only">Abilities</span>
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>Abilities</TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
};
