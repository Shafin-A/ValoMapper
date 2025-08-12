import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "@/components/ui/sidebar";
import Image from "next/image";
import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type Agent = {
  name: string;
  src: string;
  role: "Duelist" | "Controller" | "Initiator" | "Sentinel";
};

interface AgentsSidebarProps {
  agentIcons: Agent[];
  sidebarOpen: boolean;
}

const roleTabs = [
  { value: "All", label: "All" },
  { value: "Duelist", label: "Duelist" },
  { value: "Controller", label: "Controller" },
  { value: "Initiator", label: "Initiator" },
  { value: "Sentinel", label: "Sentinel" },
];

import { Button } from "@/components/ui/button";
import { Grid3x3 } from "lucide-react";
import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import { AgentCanvas } from "@/app/page";

const roleIcons: Record<string, string> = {
  Controller: "/roles/controller.png",
  Duelist: "/roles/duelist.png",
  Initiator: "/roles/initiator.png",
  Sentinel: "/roles/sentinel.png",
};

const AgentsSidebar: React.FC<AgentsSidebarProps> = ({
  agentIcons,
  sidebarOpen,
}) => {
  const [selectedRole, setSelectedRole] = useState<string>("All");
  const [isAlly, setIsAlly] = useState(true);
  const [onMap, setOnMap] = useState(false);

  const filteredAgents =
    selectedRole === "All"
      ? agentIcons
      : agentIcons.filter((agent) => agent.role === selectedRole);

  const handleDragStart = (
    e: React.DragEvent<HTMLImageElement>,
    agent: Agent,
    isAlly: boolean
  ) => {
    const dragPreview = document.createElement("div");

    dragPreview.style.width = "50px";
    dragPreview.style.height = "50px";
    dragPreview.style.backgroundColor = isAlly ? "#18636c" : "#FF4655";
    dragPreview.style.display = "flex";
    dragPreview.style.alignItems = "center";
    dragPreview.style.justifyContent = "center";
    dragPreview.style.borderRadius = "8px";
    dragPreview.style.position = "absolute";
    dragPreview.style.top = "-9999px";

    const clonedImg = e.currentTarget.cloneNode(true) as HTMLImageElement;
    clonedImg.draggable = false;
    dragPreview.appendChild(clonedImg);

    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, 25, 25);

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
                  className="data-[state=checked]:bg-[#18636c] data-[state=unchecked]:!bg-[#FF4655]"
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
            <TabsList className="flex justify-between gap-2 mb-4 w-full">
              {roleTabs.map((tab) => {
                const isSelected = tab.value === selectedRole;
                let icon: React.ReactNode;
                if (tab.value === "All") {
                  icon = (
                    <Grid3x3
                      className="!size-6.5"
                      strokeWidth={2.5}
                      style={{ opacity: isSelected ? 1 : 0.5 }}
                    />
                  );
                } else {
                  const src = roleIcons[tab.value];
                  icon = src ? (
                    <Image
                      src={src}
                      alt={tab.value}
                      width={24}
                      height={24}
                      style={{ opacity: isSelected ? 1 : 0.5 }}
                    />
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
                  {filteredAgents.map((agent) => (
                    <Image
                      key={agent.name}
                      src={agent.src}
                      alt={agent.name}
                      width={50}
                      height={50}
                      draggable
                      style={{ cursor: "grab" }}
                      onDragStart={(e) => handleDragStart(e, agent, isAlly)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
};

export default AgentsSidebar;
