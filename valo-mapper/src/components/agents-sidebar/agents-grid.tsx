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
import {
  useCanvasAgents,
  useCanvasUi,
} from "@/contexts/canvas-context";
import { useSettings } from "@/contexts/settings-context";
import { useValorantTerms } from "@/contexts/valorant-terms-context";
import { AGENTS, TEMP_DRAG_ID } from "@/lib/consts";
import {
  getLocalizedAgentName,
  getLocalizedRoleName,
} from "@/lib/i18n/valorant-terms";
import { Agent, AgentRole } from "@/lib/types";
import { useTranslations } from "next-intl";
import { getAgentImgSrc } from "@/lib/assets";
import { EllipsisVertical, Users } from "lucide-react";
import Image from "next/image";

interface AgentsGridProps {
  selectedRole: AgentRole | "All";
  onMap: boolean;
  onAgentClick: (agent: Agent | null) => void;
  onAgentPointerDown: (event: React.PointerEvent, agent: Agent | null) => void;
  selectedAgentAbilities: Agent | null;
  setSelectedAgentAbilities: React.Dispatch<React.SetStateAction<Agent | null>>;
}

export const AgentsGrid: React.FC<AgentsGridProps> = ({
  selectedRole,
  onMap,
  onAgentClick,
  onAgentPointerDown,
  selectedAgentAbilities,
  setSelectedAgentAbilities,
}) => {
  const { agentsSettings } = useSettings();

  const { agentsOnCanvas } = useCanvasAgents();
  const { isAlly, selectedCanvasIcon, setSelectedCanvasIcon } = useCanvasUi();
  const valorantTerms = useValorantTerms();
  const t = useTranslations("agents");
  const localizedRole = getLocalizedRoleName(valorantTerms, selectedRole);

  const allyColor = agentsSettings.allyColor;
  const enemyColor = agentsSettings.enemyColor;

  const agentsByRole =
    selectedRole === "All"
      ? AGENTS
      : AGENTS.filter((agent) => agent.role === selectedRole);

  const filteredAgents = onMap
    ? agentsByRole.filter((agent) =>
        agentsOnCanvas.some(
          (canvasAgent) =>
            canvasAgent.name === agent.name && canvasAgent.id !== TEMP_DRAG_ID,
        ),
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
                ? t("empty")
                : t("emptyByRole", { role: localizedRole })}
            </EmptyTitle>
            <EmptyDescription>
              {selectedRole === "All"
                ? t("addToMap")
                : t("addRoleToMap", { role: localizedRole })}
            </EmptyDescription>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 p-2">
          {filteredAgents.map((agent) => {
            const isSelected = selectedCanvasIcon?.name === agent.name;
            const borderColor = isAlly ? allyColor : enemyColor;
            const displayName = getLocalizedAgentName(
              valorantTerms,
              agent.name,
            );

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
                        touchAction: "none",
                        WebkitTouchCallout: "none",
                      }}
                      src={getAgentImgSrc(agent.name)}
                      alt={displayName}
                      width={50}
                      height={50}
                      draggable={false}
                      onDragStart={(event) => event.preventDefault()}
                      onPointerDown={(event) =>
                        onAgentPointerDown(event, agent)
                      }
                      onClick={() => onAgentClick(agent)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{displayName}</TooltipContent>
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
                      <span className="sr-only">{t("abilities")}</span>
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>{t("abilities")}</TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
};
