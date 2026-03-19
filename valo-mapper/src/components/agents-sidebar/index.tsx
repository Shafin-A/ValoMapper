import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dispatch,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import {
  AbilityCanvas,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  AgentRole,
} from "@/lib/types";
import { useSettings } from "@/contexts/settings-context";
import { RoleTabs } from "./role-tabs";
import { SettingsPanel } from "./settings-panel";
import { AgentsGrid } from "./agents-grid";
import AgentAbilities from "./agent-abilities";
import { SIDEBAR_WIDTH, TEMP_DRAG_ID } from "@/lib/consts";
import { useCanvas } from "@/contexts/canvas-context";
import { getAgentImgSrc, isAgent } from "@/lib/utils";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { Layer, Stage } from "react-konva";
import { AbilityIcon, CanvasIcon } from "@/components/canvas-icons";
import { ABILITY_LOOKUP } from "@/lib/consts/configs/agent-icon/consts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentsSidebarProps {
  sidebarOpen: boolean;
}

export const AgentsSidebar = ({ sidebarOpen }: AgentsSidebarProps) => {
  const {
    agentsSettings,
    abilitiesSettings,
    updateAgentsSettings,
    updateAbilitiesSettings,
  } = useSettings();

  const {
    agentsOnCanvas,
    abilitiesOnCanvas,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    selectedCanvasIcon,
    setSelectedCanvasIcon,
    isSidebarDragActive,
    setIsSidebarDragActive,
    currentStageScale,
    isAlly,
    setIsAlly,
    setIsDrawMode,
    setEditingTextId,
    isLoadingLobby,
    isErrorLobby,
  } = useCanvas();

  const [selectedRole, setSelectedRole] = useState<"All" | AgentRole>("All");
  const [onMap, setOnMap] = useState(false);
  const [selectedAgentAbilities, setSelectedAgentAbilities] =
    useState<Agent | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const tempDragAgent = agentsOnCanvas.find(
    (agent) => agent.id === TEMP_DRAG_ID,
  );
  const tempDragAbility = abilitiesOnCanvas.find(
    (ability) => ability.id === TEMP_DRAG_ID,
  );

  const previewScale = currentStageScale > 0 ? currentStageScale : 1;

  const dragPreviewX = dragPreviewPosition
    ? dragPreviewPosition.x / previewScale
    : 0;
  const dragPreviewY = dragPreviewPosition
    ? dragPreviewPosition.y / previewScale
    : 0;

  useEffect(() => {
    if (!isSidebarDragActive) {
      setDragPreviewPosition(null);
      return;
    }

    const handleWindowPointerMove = (event: PointerEvent) => {
      setDragPreviewPosition({ x: event.clientX, y: event.clientY });
    };

    const clearDragPreview = () => {
      setDragPreviewPosition(null);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", clearDragPreview);
    window.addEventListener("pointercancel", clearDragPreview);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", clearDragPreview);
      window.removeEventListener("pointercancel", clearDragPreview);
    };
  }, [isSidebarDragActive]);

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);

    return () => {
      window.removeEventListener("resize", updateViewportSize);
    };
  }, []);

  const beginIconPlacement = <T extends AgentCanvas | AbilityCanvas>(
    icon: Agent | AbilityIconItem,
    setIconsOnCanvas: Dispatch<SetStateAction<T[]>>,
  ) => {
    setSelectedCanvasIcon(icon);

    const newCanvasIcon = {
      ...icon,
      id: TEMP_DRAG_ID,
      isAlly: isAlly,
      x: -1000,
      y: -1000,
    } as T;

    setIconsOnCanvas((prev) => {
      const withoutDrag = prev.filter(
        (canvasIcon) => canvasIcon.id !== TEMP_DRAG_ID,
      );
      return [...withoutDrag, newCanvasIcon];
    });
  };

  const handleIconClick = <T extends AgentCanvas | AbilityCanvas>(
    icon: Agent | AbilityIconItem,
    setIconsOnCanvas: Dispatch<SetStateAction<T[]>>,
  ) => {
    const isSameIcon = selectedCanvasIcon?.name === icon.name;

    if (isSameIcon) {
      if (isSidebarDragActive) {
        setIsSidebarDragActive(false);
        return;
      }

      setIconsOnCanvas((prev) =>
        prev.filter((canvasIcon) => canvasIcon.id !== TEMP_DRAG_ID),
      );
      setSelectedCanvasIcon(null);
    } else {
      beginIconPlacement(icon, setIconsOnCanvas);
      setIsSidebarDragActive(false);
    }
  };

  const handleIconPointerDown = <T extends AgentCanvas | AbilityCanvas>(
    event: ReactPointerEvent,
    icon: Agent | AbilityIconItem,
    setIconsOnCanvas: Dispatch<SetStateAction<T[]>>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();

    const isSameIcon = selectedCanvasIcon?.name === icon.name;
    if (isSameIcon) {
      return;
    }

    setDragPreviewPosition({ x: event.clientX, y: event.clientY });
    setIsDrawMode(false);
    setEditingTextId(null);
    beginIconPlacement(icon, setIconsOnCanvas);
    setIsSidebarDragActive(true);
  };

  const handleAgentClick = (agent: Agent | null) => {
    if (!agent) return;
    setIsDrawMode(false);
    setEditingTextId(null);
    setSelectedAgentAbilities(null);
    handleIconClick(agent, setAgentsOnCanvas);
  };

  const handleAgentPointerDown = (
    event: ReactPointerEvent,
    agent: Agent | null,
  ) => {
    if (!agent) return;
    setSelectedAgentAbilities(null);
    handleIconPointerDown(event, agent, setAgentsOnCanvas);
  };

  const handleAbilityClick = (ability: AbilityIconItem | null) => {
    if (!ability) return;
    setIsDrawMode(false);
    setEditingTextId(null);
    handleIconClick(ability, setAbilitiesOnCanvas);
  };

  const handleAbilityPointerDown = (
    event: ReactPointerEvent,
    ability: AbilityIconItem | null,
  ) => {
    if (!ability) return;
    handleIconPointerDown(event, ability, setAbilitiesOnCanvas);
  };

  return (
    <SidebarProvider
      open={sidebarOpen}
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
              <span className="text-base font-semibold">Agents</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="inline-flex items-center justify-center"
                    type="button"
                  >
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-2">
                    <p>
                      Press E while hovering an agent/ability on the map to
                      delete it
                    </p>
                    <p>
                      Choose an agent/ability, then click the map to place it,
                      or drag it directly onto the map
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  style={{
                    backgroundColor: isAlly
                      ? agentsSettings.allyColor
                      : agentsSettings.enemyColor,
                  }}
                  checked={isAlly}
                  onCheckedChange={setIsAlly}
                  disabled={isLoadingLobby || isErrorLobby}
                />
                <span className="text-sm">{isAlly ? "Ally" : "Enemy"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={onMap}
                  onCheckedChange={(checked) => setOnMap(!!checked)}
                  disabled={isLoadingLobby || isErrorLobby}
                />
                <span className="text-sm">On map</span>
              </div>
            </div>
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
                  Agents Settings
                </AccordionTrigger>
                <AccordionContent>
                  <SettingsPanel
                    settings={agentsSettings}
                    onSettingsChange={updateAgentsSettings}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="abilities-settings">
                <AccordionTrigger className="px-2">
                  Abilities Settings
                </AccordionTrigger>
                <AccordionContent>
                  <SettingsPanel
                    settings={abilitiesSettings}
                    onSettingsChange={updateAbilitiesSettings}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {isLoadingLobby && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Loading agents...
              </span>
            </div>
          )}

          {isErrorLobby && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center bg-background/80 backdrop-blur-sm">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  Failed to load lobby
                </span>
                <span className="text-xs text-muted-foreground">
                  Please try again later
                </span>
              </div>
            </div>
          )}
        </SidebarContent>
      </Sidebar>
      <AgentAbilities
        agent={selectedAgentAbilities}
        sidebarOpen={sidebarOpen}
        onClose={() => setSelectedAgentAbilities(null)}
        onAbilityClick={handleAbilityClick}
        onAbilityPointerDown={handleAbilityPointerDown}
      />

      {isSidebarDragActive &&
        selectedCanvasIcon &&
        dragPreviewPosition &&
        viewportSize.width > 0 &&
        viewportSize.height > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-120"
            style={{ inset: 0 }}
          >
            <Stage
              width={viewportSize.width}
              height={viewportSize.height}
              scaleX={previewScale}
              scaleY={previewScale}
            >
              <Layer listening={false}>
                {tempDragAgent && isAgent(selectedCanvasIcon) && (
                  <CanvasIcon
                    id={TEMP_DRAG_ID}
                    isAlly={tempDragAgent.isAlly}
                    x={dragPreviewX}
                    y={dragPreviewY}
                    src={getAgentImgSrc(selectedCanvasIcon.name)}
                    isListening={false}
                    draggable={false}
                    width={agentsSettings.scale}
                    height={agentsSettings.scale}
                    borderOpacity={agentsSettings.borderOpacity}
                    strokeWidth={agentsSettings.borderWidth}
                    radius={agentsSettings.radius}
                    allyColor={agentsSettings.allyColor}
                    enemyColor={agentsSettings.enemyColor}
                  />
                )}

                {tempDragAbility && !isAgent(selectedCanvasIcon) && (
                  <AbilityIcon
                    id={TEMP_DRAG_ID}
                    isAlly={tempDragAbility.isAlly}
                    action={tempDragAbility.action}
                    x={dragPreviewX}
                    y={dragPreviewY}
                    rotation={tempDragAbility.currentRotation}
                    src={ABILITY_LOOKUP[tempDragAbility.name].src}
                    isListening={false}
                    draggable={false}
                    width={abilitiesSettings.scale}
                    height={abilitiesSettings.scale}
                    borderOpacity={abilitiesSettings.borderOpacity}
                    strokeWidth={abilitiesSettings.borderWidth}
                    radius={abilitiesSettings.radius}
                    allyColor={abilitiesSettings.allyColor}
                    enemyColor={abilitiesSettings.enemyColor}
                    currentPath={tempDragAbility.currentPath}
                    currentLength={tempDragAbility.currentLength}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        )}
    </SidebarProvider>
  );
};
