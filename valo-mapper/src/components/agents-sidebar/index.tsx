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
  useCallback,
  Dispatch,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AbilityCanvas,
  AbilityIconDefinition,
  AbilityIconItem,
  Agent,
  AgentCanvas,
  AgentRole,
} from "@/lib/types";
import { defaultIconSettings, useSettings } from "@/contexts/settings-context";
import { RoleTabs } from "./role-tabs";
import { SettingsPanel } from "./settings-panel";
import { AgentsGrid } from "./agents-grid";
import AgentAbilities from "./agent-abilities";
import { SIDEBAR_WIDTH, TEMP_DRAG_ID } from "@/lib/consts";
import { useCanvas } from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { getAgentImgSrc, isAgent } from "@/lib/utils";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { Layer, Stage } from "react-konva";
import { AbilityIcon, CanvasIcon } from "@/components/canvas-icons";
import {
  ABILITY_LOOKUP,
  getAbilityVariants,
  resolveAbilityVariant,
} from "@/lib/consts/configs/agent-icon/consts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

interface AgentsSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen?: Dispatch<SetStateAction<boolean>>;
}

type PendingSidebarDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  icon: Agent | AbilityIconItem;
  kind: "agent" | "ability";
};

export const AgentsSidebar = ({
  sidebarOpen,
  setSidebarOpen,
}: AgentsSidebarProps) => {
  const isMobile = useIsMobile();

  const {
    agentsSettings,
    abilitiesSettings,
    updateAgentsSettings,
    updateAbilitiesSettings,
  } = useSettings();

  const { notifyAgentsSettingsChanged, notifyAbilitiesSettingsChanged } =
    useCollaborativeCanvas();

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
  const [selectedAbilityVariants, setSelectedAbilityVariants] = useState<
    Record<string, number>
  >({});
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const pendingSidebarDragRef = useRef<PendingSidebarDrag | null>(null);
  const didStartSidebarDragRef = useRef(false);
  const suppressClickUntilRef = useRef(0);
  const ignoreNextSidebarClickRef = useRef(false);

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
    if (sidebarOpen) return;
    setSelectedAgentAbilities(null);
  }, [sidebarOpen]);

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

  const beginIconPlacement = useCallback(
    <T extends AgentCanvas | AbilityCanvas>(
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
    },
    [isAlly, setSelectedCanvasIcon],
  );

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

  const handleIconClick = <T extends AgentCanvas | AbilityCanvas>(
    icon: Agent | AbilityIconItem,
    setIconsOnCanvas: Dispatch<SetStateAction<T[]>>,
  ) => {
    if (ignoreNextSidebarClickRef.current) {
      ignoreNextSidebarClickRef.current = false;
      return;
    }

    if (performance.now() < suppressClickUntilRef.current) {
      return;
    }

    const isSameIcon = selectedCanvasIcon
      ? isAgent(selectedCanvasIcon) && isAgent(icon)
        ? selectedCanvasIcon.name === icon.name
        : !isAgent(selectedCanvasIcon) &&
          !isAgent(icon) &&
          selectedCanvasIcon.id === icon.id
      : false;

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

  const handleIconPointerDown = (
    event: ReactPointerEvent,
    icon: Agent | AbilityIconItem,
    kind: "agent" | "ability",
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();

    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    const isSameIcon = selectedCanvasIcon
      ? isAgent(selectedCanvasIcon) && isAgent(icon)
        ? selectedCanvasIcon.name === icon.name
        : !isAgent(selectedCanvasIcon) &&
          !isAgent(icon) &&
          selectedCanvasIcon.id === icon.id
      : false;
    if (isSameIcon) {
      return;
    }

    pendingSidebarDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      icon,
      kind,
    };
    didStartSidebarDragRef.current = false;
  };

  const handleAgentClick = (agent: Agent | null) => {
    if (!agent) return;
    setIsDrawMode(false);
    setEditingTextId(null);
    setSelectedAgentAbilities(null);
    handleIconClick(agent, setAgentsOnCanvas);
    if (isMobile) {
      setSidebarOpen?.(false);
    }
  };

  const handleAgentPointerDown = (
    event: ReactPointerEvent,
    agent: Agent | null,
  ) => {
    if (!agent) return;
    setSelectedAgentAbilities(null);
    handleIconPointerDown(event, agent, "agent");
  };

  const handleAbilityClick = (ability: AbilityIconItem | null) => {
    if (!ability) return;
    setIsDrawMode(false);
    setEditingTextId(null);
    handleIconClick(ability, setAbilitiesOnCanvas);
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

  useEffect(() => {
    const DRAG_START_DISTANCE_PX = 4;

    const handleWindowPointerMove = (event: PointerEvent) => {
      const pendingDrag = pendingSidebarDragRef.current;
      if (!pendingDrag || pendingDrag.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - pendingDrag.startX;
      const dy = event.clientY - pendingDrag.startY;
      const dragDistance = Math.hypot(dx, dy);

      if (dragDistance < DRAG_START_DISTANCE_PX) {
        return;
      }

      setIsDrawMode(false);
      setEditingTextId(null);
      setDragPreviewPosition({ x: event.clientX, y: event.clientY });

      if (pendingDrag.kind === "agent") {
        beginIconPlacement(pendingDrag.icon as Agent, setAgentsOnCanvas);
      } else {
        beginIconPlacement(
          pendingDrag.icon as AbilityIconItem,
          setAbilitiesOnCanvas,
        );
      }

      ignoreNextSidebarClickRef.current = true;
      setIsSidebarDragActive(true);
      didStartSidebarDragRef.current = true;
      pendingSidebarDragRef.current = null;
    };

    const clearPendingDrag = (event: PointerEvent) => {
      const pendingDrag = pendingSidebarDragRef.current;
      if (pendingDrag && pendingDrag.pointerId === event.pointerId) {
        pendingSidebarDragRef.current = null;
      }

      if (didStartSidebarDragRef.current) {
        suppressClickUntilRef.current = performance.now() + 250;
        didStartSidebarDragRef.current = false;
      }
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", clearPendingDrag);
    window.addEventListener("pointercancel", clearPendingDrag);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", clearPendingDrag);
      window.removeEventListener("pointercancel", clearPendingDrag);
    };
  }, [
    beginIconPlacement,
    setAgentsOnCanvas,
    setAbilitiesOnCanvas,
    setEditingTextId,
    setIsDrawMode,
    setIsSidebarDragActive,
  ]);

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
                  Abilities Settings
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
