import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AGENTS, ROLE_ICONS } from "@/lib/consts";
import { AbilityCanvas, Agent, AgentCanvas, IconSettings } from "@/lib/types";
import { debounce } from "@/lib/utils";
import { Grid3x3 } from "lucide-react";
import Image from "next/image";
import React, { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components//ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import AgentAbilities from "./agent-abilities";

interface AgentsSidebarProps {
  sidebarOpen: boolean;
  agentsOnCanvas: AgentCanvas[];
  agentsSettings: IconSettings;
  setAgentsSettings: Dispatch<SetStateAction<IconSettings>>;
  abilitiesOnCanvas: AbilityCanvas[];
  abilitiesSettings: IconSettings;
  setAbilitiesSettings: Dispatch<SetStateAction<IconSettings>>;
}

const roleTabs = [
  { value: "All", label: "All" },
  { value: "Duelist", label: "Duelist" },
  { value: "Controller", label: "Controller" },
  { value: "Initiator", label: "Initiator" },
  { value: "Sentinel", label: "Sentinel" },
];

const AgentsSidebar: React.FC<AgentsSidebarProps> = ({
  sidebarOpen,
  agentsOnCanvas,
  agentsSettings,
  setAgentsSettings,
  abilitiesOnCanvas,
  abilitiesSettings,
  setAbilitiesSettings,
}) => {
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [isAlly, setIsAlly] = useState(true);
  const [onMap, setOnMap] = useState(false);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const debouncedSetAgentAllyColor = useMemo(
    () =>
      debounce(
        (color: string) =>
          setAgentsSettings({ ...agentsSettings, allyColor: color }),
        16
      ),
    [agentsSettings, setAgentsSettings]
  );

  const debouncedSetAgentEnemyColor = useMemo(
    () =>
      debounce(
        (color: string) =>
          setAgentsSettings({ ...agentsSettings, enemyColor: color }),
        16
      ),
    [agentsSettings, setAgentsSettings]
  );

  const debouncedSetAbilityAllyColor = useMemo(
    () =>
      debounce(
        (color: string) =>
          setAbilitiesSettings({ ...abilitiesSettings, allyColor: color }),
        16
      ),
    [abilitiesSettings, setAbilitiesSettings]
  );

  const debouncedSetAbilityEnemyColor = useMemo(
    () =>
      debounce(
        (color: string) =>
          setAbilitiesSettings({ ...abilitiesSettings, enemyColor: color }),
        16
      ),
    [abilitiesSettings, setAbilitiesSettings]
  );

  const agentsByRole =
    selectedRole === "All"
      ? AGENTS
      : AGENTS.filter((agent) => agent.role === selectedRole);

  const handleDragStart = (
    e: React.DragEvent<HTMLImageElement>,
    agent: Agent,
    isAlly: boolean,
    allyColor: string,
    enemyColor: string
  ) => {
    const dragPreview = document.createElement("div");

    dragPreview.style.width = `${agentsSettings.scale}px`;
    dragPreview.style.height = `${agentsSettings.scale}px`;

    const alphaHex = Math.round(agentsSettings.boxOpacity * 255)
      .toString(16)
      .padStart(2, "0");

    dragPreview.style.backgroundColor = isAlly
      ? `${allyColor}${alphaHex}`
      : `${enemyColor}${alphaHex}`;

    dragPreview.style.display = "flex";
    dragPreview.style.alignItems = "center";
    dragPreview.style.justifyContent = "center";
    dragPreview.style.borderRadius = `${agentsSettings.radius}px`;
    dragPreview.style.position = "absolute";
    dragPreview.style.top = "-9999px";

    const clonedImg = e.currentTarget.cloneNode(true) as HTMLImageElement;
    clonedImg.style.width = `${agentsSettings.scale}px`;
    clonedImg.style.height = `${agentsSettings.scale}px`;
    clonedImg.style.borderRadius = `${agentsSettings.radius}px`;
    clonedImg.draggable = false;

    dragPreview.appendChild(clonedImg);

    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 0, 0);

    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);

    const agentCanvas: AgentCanvas = {
      ...agent,
      id: agentsOnCanvas.length,
      isAlly,
      x: 0,
      y: 0,
    };
    e.dataTransfer.setData("agent", JSON.stringify(agentCanvas));
  };

  return (
    <SidebarProvider
      open={sidebarOpen}
      style={{
        ["--sidebar-width" as keyof React.CSSProperties]: "20rem",
        ["--sidebar-width-mobile" as keyof React.CSSProperties]: "20rem",
      }}
    >
      <Sidebar
        className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
        collapsible="offcanvas"
        side="right"
      >
        <SidebarHeader>
          <div className="flex flex-col gap-3 p-2">
            <span className="text-base font-semibold">Agents</span>
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
                />
                <span className="text-sm">{isAlly ? "Ally" : "Enemy"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={onMap}
                  onCheckedChange={(checked) => setOnMap(!!checked)}
                />
                <span className="text-sm">On map</span>
              </div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <Tabs
            value={selectedRole}
            onValueChange={setSelectedRole}
            className="w-full"
          >
            <TabsList className="flex justify-between gap-2 mb-4 w-full rounded-none">
              {roleTabs.map((tab) => {
                const isSelected = tab.value === selectedRole;
                let icon: React.ReactNode;
                if (tab.value === "All") {
                  icon = (
                    <div className="w-7 h-7 flex items-center justify-center">
                      <Grid3x3
                        className="!size-6.5"
                        strokeWidth={2.5}
                        style={{ opacity: isSelected ? 1 : 0.5 }}
                      />
                    </div>
                  );
                } else {
                  const src = ROLE_ICONS[tab.value];
                  icon = src ? (
                    <div className="w-7 h-7 flex items-center justify-center">
                      <Image
                        src={src}
                        alt={tab.value}
                        width={24}
                        height={24}
                        style={{ opacity: isSelected ? 1 : 0.5 }}
                      />
                    </div>
                  ) : (
                    <span className="w-8 h-8 bg-gray-300 rounded" />
                  );
                }
                return (
                  <TabsTrigger key={tab.value} value={tab.value} asChild>
                    <Button
                      variant="ghost"
                      className="flex flex-col items-center gap-1 p-2 transition-all hover:scale-105"
                    >
                      {icon}
                    </Button>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent value={selectedRole} className="h-[320px]">
              <ScrollArea className="h-full w-full">
                <div className="grid grid-cols-4 gap-4 p-2">
                  {agentsByRole
                    .filter((agent) =>
                      onMap
                        ? agentsOnCanvas.some(
                            (canvasAgent) => canvasAgent.name === agent.name
                          )
                        : true
                    )
                    .map((agent) => (
                      <Image
                        key={agent.name}
                        title={agent.name}
                        src={agent.src}
                        alt={agent.name}
                        width={50}
                        height={50}
                        draggable
                        style={{ cursor: "grab" }}
                        onClick={() =>
                          setSelectedAgent(
                            selectedAgent?.name === agent.name ? null : agent
                          )
                        }
                        onDragStart={(e) =>
                          handleDragStart(
                            e,
                            agent,
                            isAlly,
                            agentsSettings.allyColor,
                            agentsSettings.enemyColor
                          )
                        }
                      />
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          <Separator />
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="agents-settings">
              <AccordionTrigger className="px-2">
                Agents Settings
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex items-center gap-6 p-2">
                  <span className="text-sm font-medium w-20">Scale</span>
                  <Slider
                    value={[agentsSettings.scale]}
                    onValueChange={(value) =>
                      setAgentsSettings({ ...agentsSettings, scale: value[0] })
                    }
                    min={25}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-6 p-2">
                  <span className="text-sm font-medium w-20">Radius</span>
                  <Slider
                    value={[agentsSettings.radius]}
                    onValueChange={(value) =>
                      setAgentsSettings({ ...agentsSettings, radius: value[0] })
                    }
                    min={1}
                    max={50}
                    step={1}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-6 p-2">
                  <span className="text-sm font-medium w-20">
                    Color Opacity
                  </span>
                  <Slider
                    value={[agentsSettings.boxOpacity]}
                    onValueChange={(value) =>
                      setAgentsSettings({
                        ...agentsSettings,
                        boxOpacity: value[0],
                      })
                    }
                    min={0}
                    max={1}
                    step={0.1}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-6 p-2">
                  <span className="text-sm font-medium w-20">Ally Color</span>
                  <input
                    type="color"
                    value={agentsSettings.allyColor}
                    onChange={(e) => debouncedSetAgentAllyColor(e.target.value)}
                    className="h-6 w-6 cursor-pointer rounded"
                  />
                </div>
                <div className="flex items-center gap-6 p-2">
                  <span className="text-sm font-medium w-20">Enemy Color</span>
                  <input
                    type="color"
                    value={agentsSettings.enemyColor}
                    onChange={(e) =>
                      debouncedSetAgentEnemyColor(e.target.value)
                    }
                    className="h-6 w-6 cursor-pointer rounded"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="abilities-settings">
              <AccordionTrigger className="px-2">
                Abilities Settings
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex items-center gap-6 p-2">
                  <span className="text-sm font-medium w-20">Scale</span>
                  <Slider
                    value={[abilitiesSettings.scale]}
                    onValueChange={(value) =>
                      setAbilitiesSettings({
                        ...abilitiesSettings,
                        scale: value[0],
                      })
                    }
                    min={25}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-6 p-2">
                  <span className="text-sm font-medium w-20">Radius</span>
                  <Slider
                    value={[abilitiesSettings.radius]}
                    onValueChange={(value) =>
                      setAbilitiesSettings({
                        ...abilitiesSettings,
                        radius: value[0],
                      })
                    }
                    min={1}
                    max={50}
                    step={1}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-6 p-2">
                  <span className="text-sm font-medium w-20">
                    Color Opacity
                  </span>
                  <Slider
                    value={[abilitiesSettings.boxOpacity]}
                    onValueChange={(value) =>
                      setAbilitiesSettings({
                        ...abilitiesSettings,
                        boxOpacity: value[0],
                      })
                    }
                    min={0}
                    max={1}
                    step={0.1}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-6 p-2">
                  <span className="text-sm font-medium w-20">Ally Color</span>
                  <input
                    type="color"
                    value={abilitiesSettings.allyColor}
                    onChange={(e) =>
                      debouncedSetAbilityAllyColor(e.target.value)
                    }
                    className="h-6 w-6 cursor-pointer rounded"
                  />
                </div>
                <div className="flex items-center gap-6 p-2">
                  <span className="text-sm font-medium w-20">Enemy Color</span>
                  <input
                    type="color"
                    value={abilitiesSettings.enemyColor}
                    onChange={(e) =>
                      debouncedSetAbilityEnemyColor(e.target.value)
                    }
                    className="h-6 w-6 cursor-pointer rounded"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </SidebarContent>
      </Sidebar>
      <AgentAbilities
        agent={selectedAgent}
        sidebarOpen={sidebarOpen}
        abilitiesOnCanvas={abilitiesOnCanvas}
        abilitiesSettings={abilitiesSettings}
        isAlly={isAlly}
        onClose={() => setSelectedAgent(null)}
      />
    </SidebarProvider>
  );
};

export default AgentsSidebar;
