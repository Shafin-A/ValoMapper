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
import { Agent, AgentCanvas } from "@/lib/types";
import { debounce } from "@/lib/utils";
import { Grid3x3 } from "lucide-react";
import Image from "next/image";
import React, { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Checkbox } from "./ui/checkbox";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";

interface AgentsSidebarProps {
  sidebarOpen: boolean;
  agentsOnCanvas: AgentCanvas[];
  agentsScale: number;
  setAgentsScale: Dispatch<SetStateAction<number>>;
  agentsBoxOpacity: number;
  setAgentsBoxOpacity: Dispatch<SetStateAction<number>>;
  agentsRadius: number;
  setAgentsRadius: Dispatch<SetStateAction<number>>;
  allyColor: string;
  setAllyColor: Dispatch<SetStateAction<string>>;
  enemyColor: string;
  setEnemyColor: Dispatch<SetStateAction<string>>;
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
  agentsScale,
  setAgentsScale,
  agentsBoxOpacity,
  setAgentsBoxOpacity,
  agentsRadius,
  setAgentsRadius,
  allyColor,
  setAllyColor,
  enemyColor,
  setEnemyColor,
}) => {
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [isAlly, setIsAlly] = useState(true);
  const [onMap, setOnMap] = useState(false);

  const debouncedSetAllyColor = useMemo(
    () => debounce((color: string) => setAllyColor(color), 16),
    [setAllyColor]
  );

  const debouncedSetEnemyColor = useMemo(
    () => debounce((color: string) => setEnemyColor(color), 16),
    [setEnemyColor]
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

    dragPreview.style.width = `${agentsScale}px`;
    dragPreview.style.height = `${agentsScale}px`;

    const alphaHex = Math.round(agentsBoxOpacity * 255)
      .toString(16)
      .padStart(2, "0");

    dragPreview.style.backgroundColor = isAlly
      ? `${allyColor}${alphaHex}`
      : `${enemyColor}${alphaHex}`;

    dragPreview.style.display = "flex";
    dragPreview.style.alignItems = "center";
    dragPreview.style.justifyContent = "center";
    dragPreview.style.borderRadius = `${agentsRadius}px`;
    dragPreview.style.position = "absolute";
    dragPreview.style.top = "-9999px";

    const clonedImg = e.currentTarget.cloneNode(true) as HTMLImageElement;
    clonedImg.style.width = `${agentsScale}px`;
    clonedImg.style.height = `${agentsScale}px`;
    clonedImg.style.borderRadius = `${agentsRadius}px`;
    clonedImg.draggable = false;

    dragPreview.appendChild(clonedImg);

    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 0, 0);

    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);

    const agentCanvas: AgentCanvas = { ...agent, isAlly, x: 0, y: 0 };
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
                    backgroundColor: isAlly ? allyColor : enemyColor,
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
                        src={agent.src}
                        alt={agent.name}
                        width={50}
                        height={50}
                        draggable
                        style={{ cursor: "grab" }}
                        onDragStart={(e) =>
                          handleDragStart(
                            e,
                            agent,
                            isAlly,
                            allyColor,
                            enemyColor
                          )
                        }
                      />
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          <div className="flex items-center gap-6 p-2">
            <span className="text-sm font-medium w-20">Scale</span>
            <Slider
              value={[agentsScale]}
              onValueChange={(value) => setAgentsScale(value[0])}
              min={25}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-6 p-2">
            <span className="text-sm font-medium w-20">Color Opacity</span>
            <Slider
              value={[agentsBoxOpacity]}
              onValueChange={(value) => setAgentsBoxOpacity(value[0])}
              min={0}
              max={1}
              step={0.1}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-6 p-2">
            <span className="text-sm font-medium w-20">Radius</span>
            <Slider
              value={[agentsRadius]}
              onValueChange={(value) => setAgentsRadius(value[0])}
              min={1}
              max={50}
              step={1}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-6 p-2">
            <span className="text-sm font-medium w-20">Ally Color</span>
            <input
              type="color"
              value={allyColor}
              onChange={(e) => debouncedSetAllyColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded"
            />
          </div>
          <div className="flex items-center gap-6 p-2">
            <span className="text-sm font-medium w-20">Enemy Color</span>
            <input
              type="color"
              value={enemyColor}
              onChange={(e) => debouncedSetEnemyColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded"
            />
          </div>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
};

export default AgentsSidebar;
