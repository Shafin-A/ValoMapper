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
import { EllipsisVertical, Star, Users } from "lucide-react";
import Image from "next/image";

interface AgentsGridProps {
  selectedRole: AgentRole | "All";
  onMap: boolean;
  favoritesOnly?: boolean;
  favoriteAgents?: Set<string>;
  favoritesReady?: boolean;
  showFavorites?: boolean;
  onToggleFavorite?: (agentName: string) => void;
  onAgentClick: (agent: Agent | null) => void;
  onAgentPointerDown: (event: React.PointerEvent, agent: Agent | null) => void;
  selectedAgentAbilities: Agent | null;
  setSelectedAgentAbilities: React.Dispatch<React.SetStateAction<Agent | null>>;
}

export const AgentsGrid: React.FC<AgentsGridProps> = ({
  selectedRole,
  onMap,
  favoritesOnly = false,
  favoriteAgents = new Set<string>(),
  favoritesReady = false,
  showFavorites = false,
  onToggleFavorite,
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

  const filteredAgents = agentsByRole.filter((agent) => {
    if (
      onMap &&
      !agentsOnCanvas.some(
        (canvasAgent) =>
          canvasAgent.name === agent.name && canvasAgent.id !== TEMP_DRAG_ID,
      )
    ) {
      return false;
    }

    if (favoritesOnly && !favoriteAgents.has(agent.name)) {
      return false;
    }

    return true;
  });

  const emptyTitle = favoritesOnly
    ? onMap
      ? t("emptyFavoritesOnMap")
      : t("emptyFavorites")
    : selectedRole === "All"
      ? t("empty")
      : t("emptyByRole", { role: localizedRole });
  const emptyDescription = favoritesOnly
    ? t("favoriteAgentsHint")
    : selectedRole === "All"
      ? t("addToMap")
      : t("addRoleToMap", { role: localizedRole });

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
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 p-2">
          {filteredAgents.map((agent) => {
            const isSelected = selectedCanvasIcon?.name === agent.name;
            const isFavorite = favoriteAgents.has(agent.name);
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

                {showFavorites && (
                  <Tooltip delayDuration={700}>
                    <TooltipTrigger asChild>
                      <Toggle
                        size="icon"
                        aria-label={
                          isFavorite
                            ? t("removeFavorite", { name: displayName })
                            : t("addFavorite", { name: displayName })
                        }
                        pressed={isFavorite}
                        disabled={!favoritesReady}
                        onPressedChange={() => onToggleFavorite?.(agent.name)}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        className="absolute -top-2 -left-2 rounded-full text-muted-foreground hover:text-amber-500 disabled:opacity-40"
                      >
                        <Star
                          className={
                            isFavorite
                              ? "fill-amber-400 text-amber-500"
                              : undefined
                          }
                        />
                      </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isFavorite
                        ? t("removeFavorite", { name: displayName })
                        : t("addFavorite", { name: displayName })}
                    </TooltipContent>
                  </Tooltip>
                )}

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
