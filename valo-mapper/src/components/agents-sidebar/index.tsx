import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  useCallback,
  Dispatch,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import {
  AbilityIconDefinition,
  AbilityIconItem,
  Agent,
  AgentRole,
} from "@/lib/types";
import { defaultIconSettings, useSettings } from "@/contexts/settings-context";
import { RoleTabs } from "./role-tabs";
import { SettingsPanel } from "./settings-panel";
import { AgentsGrid } from "./agents-grid";
import AgentAbilities from "./agent-abilities";
import { SIDEBAR_WIDTH, TEMP_DRAG_ID } from "@/lib/consts";
import {
  useCanvasAbilities,
  useCanvasActions,
  useCanvasAgents,
  useCanvasEntityActions,
  useCanvasUi,
} from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { isAgent } from "@/lib/utils";
import { Loader2, AlertCircle, X } from "lucide-react";
import {
  getAbilityVariants,
  resolveAbilityVariant,
} from "@/lib/consts/configs/agent-icon/consts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFavoriteAgents } from "@/hooks/use-favorite-agents";
import { InfoHint } from "@/components/shared/info-hint";
import { useTranslations } from "next-intl";
import { AgentsDragPreview } from "./agents-drag-preview";
import { useAgentsSidebarDrag } from "./use-agents-sidebar-drag";

interface AgentsSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen?: Dispatch<SetStateAction<boolean>>;
  lobbyCode?: string;
}

export const AgentsSidebar = ({
  sidebarOpen,
  setSidebarOpen,
  lobbyCode,
}: AgentsSidebarProps) => {
  const t = useTranslations("agents");
  const isMobile = useIsMobile();

  const {
    agentsSettings,
    abilitiesSettings,
    updateAgentsSettings,
    updateAbilitiesSettings,
  } = useSettings();

  const { notifyAgentsSettingsChanged, notifyAbilitiesSettingsChanged } =
    useCollaborativeCanvas();

  const { agentsOnCanvas, setAgentsOnCanvas } = useCanvasAgents();
  const { abilitiesOnCanvas, setAbilitiesOnCanvas } = useCanvasAbilities();
  const { setToolIconsOnCanvas } = useCanvasEntityActions();
  const {
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    isSidebarDragActive,
    setIsSidebarDragActive,
    isAlly,
    setIsAlly,
    setIsDrawMode,
    setEditingTextId,
  } = useCanvasUi();
  const { isLoadingLobby, isErrorLobby } = useCanvasActions();

  const [selectedRole, setSelectedRole] = useState<"All" | AgentRole>("All");
  const [onMap, setOnMap] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedAgentAbilities, setSelectedAgentAbilities] =
    useState<Agent | null>(null);

  const {
    favoriteAgents,
    isReady: areFavoritesReady,
    toggleFavorite,
  } = useFavoriteAgents(lobbyCode);
  const [selectedAbilityVariants, setSelectedAbilityVariants] = useState<
    Record<string, number>
  >({});

  const {
    dragPreviewPosition,
    viewportSize,
    tempDragAgent,
    tempDragAbility,
    clearSelection,
    handleIconClick,
    handleIconPointerDown,
  } = useAgentsSidebarDrag({
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    isSidebarDragActive,
    setIsSidebarDragActive,
    isAlly,
    agentsOnCanvas,
    abilitiesOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setToolIconsOnCanvas,
    setIsDrawMode,
    setEditingTextId,
  });

  useEffect(() => {
    if (sidebarOpen) return;
    setSelectedAgentAbilities(null);
  }, [sidebarOpen]);

  const resolveAbility = useCallback(
    (ability: AbilityIconDefinition): AbilityIconItem => {
      const variantIndex = selectedAbilityVariants[ability.id] ?? 0;
      return resolveAbilityVariant(ability, variantIndex);
    },
    [selectedAbilityVariants],
  );

  const syncSelectedAbilityAction = useCallback(
    (resolved: AbilityIconItem) => {
      if (
        !selectedCanvasIcon ||
        isAgent(selectedCanvasIcon) ||
        selectedCanvasIcon.id !== resolved.id
      ) {
        return;
      }

      setSelectedCanvasIcon(resolved);
      setAbilitiesOnCanvas((prev) =>
        prev.map((canvasAbility) =>
          canvasAbility.id === TEMP_DRAG_ID
            ? { ...canvasAbility, action: resolved.action, name: resolved.name }
            : canvasAbility,
        ),
      );
    },
    [selectedCanvasIcon, setAbilitiesOnCanvas, setSelectedCanvasIcon],
  );

  const handleAbilitySwap = useCallback(
    (ability: AbilityIconDefinition) => {
      const variants = getAbilityVariants(ability);
      if (variants.length < 2) return;

      const currentIndex = selectedAbilityVariants[ability.id] ?? 0;
      const nextIndex = (currentIndex + 1) % variants.length;

      setSelectedAbilityVariants((prev) => ({
        ...prev,
        [ability.id]: nextIndex,
      }));

      syncSelectedAbilityAction(variants[nextIndex]);
    },
    [selectedAbilityVariants, syncSelectedAbilityAction],
  );

  const handleAgentClick = (agent: Agent | null) => {
    if (!agent) return;
    setIsDrawMode(false);
    setEditingTextId(null);

    const didSelect = handleIconClick(agent, setAgentsOnCanvas);
    if (!didSelect) return;

    const isSameAgent =
      selectedCanvasIcon &&
      isAgent(selectedCanvasIcon) &&
      selectedCanvasIcon.name === agent.name;
    if (isSameAgent) {
      setSelectedAgentAbilities(null);
    } else {
      setSelectedAgentAbilities(agent);
    }

    if (isMobile) {
      setSidebarOpen?.(false);
    }
  };

  const handleAgentPointerDown = (
    event: ReactPointerEvent,
    agent: Agent | null,
  ) => {
    if (!agent) return;
    handleIconPointerDown(event, agent, "agent");
  };

  const handleAbilityClick = (ability: AbilityIconItem | null) => {
    if (!ability) return;
    setIsDrawMode(false);
    setEditingTextId(null);

    const didSelect = handleIconClick(ability, setAbilitiesOnCanvas);
    if (!didSelect) return;

    if (isMobile) {
      setSidebarOpen?.(false);
    }
  };

  const handleAbilityPointerDown = (
    event: ReactPointerEvent,
    ability: AbilityIconItem | null,
  ) => {
    if (!ability) return;
    handleIconPointerDown(event, ability, "ability");
  };

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      style={{
        ["--sidebar-width" as keyof React.CSSProperties]: `${SIDEBAR_WIDTH}px`,
        ["--sidebar-width-mobile" as keyof React.CSSProperties]: `${SIDEBAR_WIDTH}px`,
      }}
    >
      <Sidebar
        data-tour="agents-sidebar"
        className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
        collapsible="offcanvas"
        side="right"
      >
        <SidebarHeader>
          <div className="flex flex-col gap-3 p-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">{t("title")}</span>
              <div className="flex items-center gap-1">
                <InfoHint label={t("sidebarHelpLabel")}>
                  <p>
                    {isMobile
                      ? t("sidebarHelpMobile")
                      : t("sidebarHelpDesktop")}
                  </p>
                </InfoHint>
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label={t("closeSidebar")}
                    onClick={() => setSidebarOpen?.(false)}
                  >
                    <X />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  aria-label={isAlly ? t("ally") : t("enemy")}
                  style={{
                    backgroundColor: isAlly
                      ? agentsSettings.allyColor
                      : agentsSettings.enemyColor,
                  }}
                  checked={isAlly}
                  onCheckedChange={(checked) => {
                    clearSelection();
                    setIsAlly(checked);
                  }}
                  disabled={isLoadingLobby || isErrorLobby}
                />
                <span className="text-sm">
                  {isAlly ? t("ally") : t("enemy")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={onMap}
                  onCheckedChange={(checked) => {
                    clearSelection();
                    setOnMap(!!checked);
                  }}
                  disabled={isLoadingLobby || isErrorLobby}
                />
                <span className="text-sm">{t("onMap")}</span>
              </div>
            </div>
            {lobbyCode && (
              <div className="flex items-center justify-end gap-2">
                <Checkbox
                  checked={favoritesOnly}
                  onCheckedChange={(checked) => {
                    setFavoritesOnly(!!checked);
                  }}
                  disabled={
                    isLoadingLobby || isErrorLobby || !areFavoritesReady
                  }
                  aria-label={t("favorites")}
                />
                <span className="text-sm">{t("favorites")}</span>
              </div>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent className="relative">
          <div
            className={
              isLoadingLobby || isErrorLobby
                ? "pointer-events-none opacity-50"
                : ""
            }
          >
            <Tabs
              value={selectedRole}
              onValueChange={(value) =>
                setSelectedRole(value as AgentRole | "All")
              }
              className="w-full"
            >
              <RoleTabs selectedRole={selectedRole} />
              <TabsContent value={selectedRole} className="h-80">
                <AgentsGrid
                  selectedRole={selectedRole}
                  onMap={onMap}
                  favoritesOnly={Boolean(lobbyCode) && favoritesOnly}
                  favoriteAgents={favoriteAgents}
                  favoritesReady={areFavoritesReady}
                  showFavorites={Boolean(lobbyCode)}
                  onToggleFavorite={toggleFavorite}
                  onAgentClick={handleAgentClick}
                  onAgentPointerDown={handleAgentPointerDown}
                  selectedAgentAbilities={selectedAgentAbilities}
                  setSelectedAgentAbilities={setSelectedAgentAbilities}
                />
              </TabsContent>
            </Tabs>
            <Separator />
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="agents-settings">
                <AccordionTrigger className="px-2">
                  {t("agentsSettings")}
                </AccordionTrigger>
                <AccordionContent>
                  <SettingsPanel
                    settings={agentsSettings}
                    onSettingsChange={(settings) => {
                      updateAgentsSettings(settings);
                      notifyAgentsSettingsChanged(settings);
                    }}
                    onReset={() => {
                      updateAgentsSettings(defaultIconSettings);
                      notifyAgentsSettingsChanged(defaultIconSettings);
                    }}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="abilities-settings">
                <AccordionTrigger className="px-2">
                  {t("abilitiesSettings")}
                </AccordionTrigger>
                <AccordionContent>
                  <SettingsPanel
                    settings={abilitiesSettings}
                    onSettingsChange={(settings) => {
                      updateAbilitiesSettings(settings);
                      notifyAbilitiesSettingsChanged(settings);
                    }}
                    onReset={() => {
                      updateAbilitiesSettings(defaultIconSettings);
                      notifyAbilitiesSettingsChanged(defaultIconSettings);
                    }}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {isLoadingLobby && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {t("loading")}
              </span>
            </div>
          )}

          {isErrorLobby && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center bg-background/80 backdrop-blur-sm">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  {t("loadLobbyFailed")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("tryAgainLater")}
                </span>
              </div>
            </div>
          )}

          {isMobile && (
            <AgentAbilities
              agent={selectedAgentAbilities}
              sidebarOpen={sidebarOpen}
              renderInDrawer
              onClose={() => setSelectedAgentAbilities(null)}
              onAbilityClick={handleAbilityClick}
              onAbilitySwap={handleAbilitySwap}
              resolveAbility={resolveAbility}
              onAbilityPointerDown={handleAbilityPointerDown}
            />
          )}
        </SidebarContent>
      </Sidebar>
      {!isMobile && (
        <AgentAbilities
          agent={selectedAgentAbilities}
          sidebarOpen={sidebarOpen}
          onClose={() => setSelectedAgentAbilities(null)}
          onAbilityClick={handleAbilityClick}
          onAbilitySwap={handleAbilitySwap}
          resolveAbility={resolveAbility}
          onAbilityPointerDown={handleAbilityPointerDown}
        />
      )}

      {isSidebarDragActive &&
        selectedCanvasIcon &&
        dragPreviewPosition &&
        viewportSize.width > 0 &&
        viewportSize.height > 0 && (
          <AgentsDragPreview
            position={dragPreviewPosition}
            viewportSize={viewportSize}
            selectedCanvasIcon={selectedCanvasIcon}
            tempDragAgent={tempDragAgent}
            tempDragAbility={tempDragAbility}
            agentsSettings={agentsSettings}
            abilitiesSettings={abilitiesSettings}
          />
        )}
    </SidebarProvider>
  );
};
